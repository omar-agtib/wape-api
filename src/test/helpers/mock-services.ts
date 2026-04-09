export const createMockMailService = () => ({
  sendWelcome: jest.fn().mockResolvedValue(undefined),
  sendSubscriptionExpiring: jest.fn().mockResolvedValue(undefined),
  sendSubscriptionExpired: jest.fn().mockResolvedValue(undefined),
  sendAccessRestricted: jest.fn().mockResolvedValue(undefined),
  sendPaymentConfirmed: jest.fn().mockResolvedValue(undefined),
  sendInvoiceCreated: jest.fn().mockResolvedValue(undefined),
  sendInvoiceValidated: jest.fn().mockResolvedValue(undefined),
  sendInvoicePaid: jest.fn().mockResolvedValue(undefined),
  sendSupplierPaymentOverdue: jest.fn().mockResolvedValue(undefined),
  sendTaskStatusChanged: jest.fn().mockResolvedValue(undefined),
  sendNcReported: jest.fn().mockResolvedValue(undefined),
  sendBudgetAlert: jest.fn().mockResolvedValue(undefined),
  sendTicketReply: jest.fn().mockResolvedValue(undefined),
  send: jest.fn().mockResolvedValue(undefined),
});

export const createMockRealtimeService = () => ({
  emitFinanceUpdated: jest.fn(),
  emitBudgetAlert: jest.fn(),
  emitProjectProgress: jest.fn(),
  emitTaskStatus: jest.fn(),
  emitInvoiceCreated: jest.fn(),
  emitInvoiceUpdated: jest.fn(),
  emitNcReported: jest.fn(),
  emitStockAlert: jest.fn(),
  emitNotification: jest.fn(),
  getConnectionCount: jest.fn().mockReturnValue(0),
});

export const createMockCloudinaryService = () => ({
  uploadFile: jest.fn().mockResolvedValue({
    secureUrl: 'https://mock.cloudinary.com/file.png',
  }),
  uploadBuffer: jest.fn().mockResolvedValue({
    secureUrl: 'https://mock.cloudinary.com/barcode.png',
  }),
  deleteFile: jest.fn().mockResolvedValue(undefined),
});

export const createMockQueryRunner = () => ({
  connect: jest.fn().mockResolvedValue(undefined),
  startTransaction: jest.fn().mockResolvedValue(undefined),
  commitTransaction: jest.fn().mockResolvedValue(undefined),
  rollbackTransaction: jest.fn().mockResolvedValue(undefined),
  release: jest.fn().mockResolvedValue(undefined),
  manager: {
    save: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
    findOne: jest.fn(),
    increment: jest.fn(),
    decrement: jest.fn(),
  },
});
