import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '../../common/enums';

export interface JwtSocketPayload {
  sub: string;
  tenantId: string;
  role: UserRole;
  email: string;
}

@WebSocketGateway({
  cors: {
    origin: '*', // Tighten in production via env
    credentials: true,
  },
  namespace: '/',
  transports: ['websocket', 'polling'],
})
export class RealtimeGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(RealtimeGateway.name);

  // Track connected sockets per tenant for diagnostics
  private readonly connectedClients = new Map<string, Set<string>>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');

    // JWT middleware — validate on every connection
    server.use((socket: Socket, next: (err?: Error) => void) => {
      try {
        const rawToken =
          (socket.handshake.auth as { token?: string })?.token ??
          socket.handshake.headers?.authorization?.replace('Bearer ', '');

        if (!rawToken) {
          return next(new UnauthorizedException('No token provided'));
        }

        const payload = this.jwtService.verify<JwtSocketPayload>(rawToken, {
          secret: this.configService.get<string>('jwt.accessSecret') ?? '',
        });

        // Attach payload to socket data for use in handlers
        (socket.data as { user: JwtSocketPayload }).user = payload;
        next();
      } catch {
        next(new UnauthorizedException('Invalid or expired token'));
      }
    });
  }

  handleConnection(client: Socket) {
    const user = (client.data as { user: JwtSocketPayload }).user;
    if (!user) return;

    // Join tenant room — all events scoped to tenant
    const room = `tenant:${user.tenantId}`;
    void client.join(room);

    // Track connection
    if (!this.connectedClients.has(user.tenantId)) {
      this.connectedClients.set(user.tenantId, new Set());
    }
    this.connectedClients.get(user.tenantId)!.add(client.id);

    this.logger.log(
      `Client connected: ${client.id} | user: ${user.email} | tenant: ${user.tenantId}`,
    );

    // Confirm connection to client
    client.emit('connected', {
      clientId: client.id,
      tenantId: user.tenantId,
      userId: user.sub,
      role: user.role,
      message: 'Connected to WAPE real-time service',
    });
  }

  handleDisconnect(client: Socket) {
    const user = (client.data as { user?: JwtSocketPayload }).user;
    if (user) {
      this.connectedClients.get(user.tenantId)?.delete(client.id);
      this.logger.log(
        `Client disconnected: ${client.id} | user: ${user.email}`,
      );
    }
  }

  // ── Client → Server messages ─────────────────────────────────────────────────

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket): void {
    client.emit('pong', {
      timestamp: new Date().toISOString(),
      clientId: client.id,
    });
  }

  @SubscribeMessage('subscribe:project')
  handleSubscribeProject(
    @MessageBody() data: { projectId: string },
    @ConnectedSocket() client: Socket,
  ): void {
    const user = (client.data as { user: JwtSocketPayload }).user;
    // Join a project-specific room for granular project updates
    const projectRoom = `project:${user.tenantId}:${data.projectId}`;
    void client.join(projectRoom);
    client.emit('subscribed:project', {
      projectId: data.projectId,
      room: projectRoom,
    });
    this.logger.debug(
      `Client ${client.id} subscribed to project ${data.projectId}`,
    );
  }

  @SubscribeMessage('unsubscribe:project')
  handleUnsubscribeProject(
    @MessageBody() data: { projectId: string },
    @ConnectedSocket() client: Socket,
  ): void {
    const user = (client.data as { user: JwtSocketPayload }).user;
    void client.leave(`project:${user.tenantId}:${data.projectId}`);
  }

  // ── Server → Client emission helpers ────────────────────────────────────────

  /** Emit to all clients of a tenant */
  emitToTenant(tenantId: string, event: string, payload: object): void {
    this.server.to(`tenant:${tenantId}`).emit(event, {
      ...payload,
      _timestamp: new Date().toISOString(),
    });
  }

  /** Emit to all clients subscribed to a specific project */
  emitToProject(
    tenantId: string,
    projectId: string,
    event: string,
    payload: object,
  ): void {
    this.server.to(`project:${tenantId}:${projectId}`).emit(event, {
      ...payload,
      _timestamp: new Date().toISOString(),
    });
    // Also emit to tenant room so dashboard clients get it
    this.emitToTenant(tenantId, event, payload);
  }

  /** Count active connections for a tenant */
  getConnectionCount(tenantId: string): number {
    return this.connectedClients.get(tenantId)?.size ?? 0;
  }
}
