// ================================================================
// CHANGES FROM PREVIOUS VERSION:
// 1. orderType       → optional (not required on every order)
// 2. orderServiceModel → vendorId optional, country column added
// 3. ticketModel     → departureDate/arrivalDate changed to varchar(30)
//                      so datetime strings like "2024-06-15T14:30" work
// ================================================================

import { relations } from 'drizzle-orm'
import {
  boolean,
  pgTable,
  serial,
  timestamp,
  varchar,
  text,
  decimal,
  date,
  uuid,
  pgEnum,
  integer,
} from 'drizzle-orm/pg-core'

// ========================
// Enums
// ========================
export const orderTypeEnum = pgEnum('order_type', [
  'ticket',
  'visa',
  'reschedule',
  'cancellation',
])
export const orderStatusEnum = pgEnum('order_status', [
  'pending',
  'confirmed',
  'completed',
  'cancelled',
])
export const packageTypeEnum = pgEnum('package_type', ['hajj', 'umrah'])
export const transactionTypeEnum = pgEnum('transaction_type', [
  'credit',
  'debit',
])
export const accountTypeEnum = pgEnum('account_type', [
  'cash',
  'bank',
  'customer',
  'vendor',
])
export const checklistStatusEnum = pgEnum('checklist_status', [
  'pending',
  'completed',
  'skipped',
])

// ========================
// Roles & Permissions
// ========================
export const roleModel = pgTable('roles', {
  roleId: serial('role_id').primaryKey(),
  roleName: varchar('role_name', { length: 50 }).notNull(),
})

export const userModel = pgTable('users', {
  userId: serial('user_id').primaryKey(),
  username: varchar('username', { length: 50 }).notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(),
  active: boolean('active').notNull().default(true),
  isPasswordResetRequired: boolean('is_password_reset_required').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

export const permissionsModel = pgTable('permissions', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 50 }).notNull().unique(),
})

export const rolePermissionsModel = pgTable('role_permissions', {
  roleId: integer('role_id').references(() => roleModel.roleId),
  permissionId: integer('permission_id')
    .notNull()
    .references(() => permissionsModel.id),
})

// ========================
// Tenants
// ========================
export const tenantModel = pgTable('tenants', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  domain: varchar('domain', { length: 100 }).unique(),
  status: varchar('status', { length: 20 }).default('active'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

// ========================
// Tenant Users
// ========================
export const tenantUserModel = pgTable('tenant_users', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenantModel.id),
  userId: integer('user_id')
    .notNull()
    .references(() => userModel.userId),
  roleId: integer('role_id')
    .notNull()
    .references(() => roleModel.roleId),
  createdAt: timestamp('created_at').defaultNow(),
})

// ========================
// Customers
// ========================
export const customerModel = pgTable('customers', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenantModel.id),
  name: varchar('name', { length: 100 }).notNull(),
  email: varchar('email', { length: 100 }),
  phone: varchar('phone', { length: 20 }),
  passportNumber: varchar('passport_number', { length: 50 }),
  address: text('address'),
  createdAt: timestamp('created_at').defaultNow(),
})

// ========================
// Vendors
// ========================
export const vendorModel = pgTable('vendors', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenantModel.id),
  name: varchar('name', { length: 100 }).notNull(),
  type: varchar('type', { length: 50 }),
  contactDetails: text('contact_details'),
  createdAt: timestamp('created_at').defaultNow(),
})

// ========================
// Orders
// ========================
export const orderModel = pgTable('orders', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenantModel.id),
  customerId: uuid('customer_id').references(() => customerModel.id),
  // ✅ CHANGE: orderType is now optional — one order can have visa+ticket services
  orderType: orderTypeEnum('order_type'),
  status: orderStatusEnum('status').default('pending'),
  totalAmount: decimal('total_amount', { precision: 10, scale: 2 }),
  dueAmount: decimal('due_amount', { precision: 10, scale: 2 }),
  travelDate: date('travel_date'),
  createdAt: timestamp('created_at').defaultNow(),
})

// ========================
// Order Services
// ========================
export const orderServiceModel = pgTable('order_services', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: uuid('order_id').references(() => orderModel.id),
  // ✅ CHANGE: vendorId is now optional (visa rows don't always have a vendor)
  vendorId: uuid('vendor_id').references(() => vendorModel.id),
  serviceType: varchar('service_type', { length: 50 }),
  // ✅ NEW: country field for visa processing rows
  country: varchar('country', { length: 100 }),
  serviceCost: decimal('service_cost', { precision: 10, scale: 2 }),
  procurementStatus: varchar('procurement_status', { length: 30 }).default(
    'pending'
  ),
})

// ========================
// Tickets
// ========================
export const ticketModel = pgTable('tickets', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: uuid('order_id').references(() => orderModel.id),
  pnr: varchar('pnr', { length: 20 }),
  airline: varchar('airline', { length: 50 }),
  origin: varchar('origin', { length: 100 }),
  destination: varchar('destination', { length: 100 }),
  // ✅ CHANGE: varchar(30) instead of date — supports "2024-06-15T14:30" datetime strings
  departureDate: varchar('departure_date', { length: 30 }),
  arrivalDate: varchar('arrival_date', { length: 30 }),
  seatClass: varchar('seat_class', { length: 20 }),
  ticketStatus: varchar('ticket_status', { length: 20 }).default('pending'),
})

// ========================
// Packages
// ========================
export const packageModel = pgTable('packages', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenantModel.id),
  name: varchar('name', { length: 100 }).notNull(),
  packageType: packageTypeEnum('package_type'),
  price: decimal('price', { precision: 10, scale: 2 }),
  enrollmentDeadline: date('enrollment_deadline'),
  createdAt: timestamp('created_at').defaultNow(),
})

export const packageCustomerModel = pgTable('package_customers', {
  id: uuid('id').defaultRandom().primaryKey(),
  packageId: uuid('package_id').references(() => packageModel.id),
  customerId: uuid('customer_id').references(() => customerModel.id),
  status: varchar('status', { length: 20 }).default('active'),
  totalFee: decimal('total_fee', { precision: 10, scale: 2 }),
  balanceDue: decimal('balance_due', { precision: 10, scale: 2 }),
  createdAt: timestamp('created_at').defaultNow(),
})

export const installmentModel = pgTable('installments', {
  id: uuid('id').defaultRandom().primaryKey(),
  packageCustomerId: uuid('package_customer_id').references(
    () => packageCustomerModel.id
  ),
  amount: decimal('amount', { precision: 10, scale: 2 }),
  dueDate: date('due_date'),
  paidAt: timestamp('paid_at'),
  status: varchar('status', { length: 20 }).default('pending'),
})

export const packageChecklistModel = pgTable('package_checklists', {
  id: uuid('id').defaultRandom().primaryKey(),
  packageId: uuid('package_id').references(() => packageModel.id),
  taskName: varchar('task_name', { length: 100 }),
  description: text('description'),
  required: boolean('required').default(true),
  createdAt: timestamp('created_at').defaultNow(),
})

export const packageChecklistItemModel = pgTable('package_checklist_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  packageCustomerId: uuid('package_customer_id')
    .notNull()
    .references(() => packageCustomerModel.id),
  checklistId: uuid('checklist_id')
    .notNull()
    .references(() => packageChecklistModel.id),
  status: checklistStatusEnum('status').default('pending'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow(),
})

export const packageVendorFeeModel = pgTable('package_vendor_fees', {
  id: uuid('id').defaultRandom().primaryKey(),
  packageId: uuid('package_id').references(() => packageModel.id),
  vendorId: uuid('vendor_id').references(() => vendorModel.id),
  feeType: varchar('fee_type', { length: 50 }),
  amount: decimal('amount', { precision: 10, scale: 2 }),
  paidAt: timestamp('paid_at'),
})

// ========================
// Finance
// ========================
export const accountModel = pgTable('accounts', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenantModel.id),
  accountType: accountTypeEnum('account_type'),
  name: varchar('name', { length: 100 }),
  balance: decimal('balance', { precision: 10, scale: 2 }).default('0'),
})

export const transactionModel = pgTable('transactions', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenantModel.id),
  accountId: uuid('account_id').references(() => accountModel.id),
  referenceType: varchar('reference_type', { length: 30 }),
  referenceId: uuid('reference_id'),
  amount: decimal('amount', { precision: 10, scale: 2 }),
  transactionType: transactionTypeEnum('transaction_type'),
  category: varchar('category', { length: 50 }),
  transactionDate: date('transaction_date'),
  status: varchar('status', { length: 20 }).default('pending'),
})

export const generalExpenseModel = pgTable('general_expenses', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenantModel.id),
  category: varchar('category', { length: 50 }),
  amount: decimal('amount', { precision: 10, scale: 2 }),
  description: text('description'),
  incurredAt: date('incurred_at'),
})

// ========================
// Relations (unchanged)
// ========================
export const roleRelations = relations(roleModel, ({ many }) => ({
  rolePermissions: many(rolePermissionsModel),
  tenantUsers: many(tenantUserModel),
}))

export const userRelations = relations(userModel, ({ many }) => ({
  tenantUsers: many(tenantUserModel),
}))

export const permissionsRelations = relations(permissionsModel, ({ many }) => ({
  rolePermissions: many(rolePermissionsModel),
}))

export const rolePermissionsRelations = relations(
  rolePermissionsModel,
  ({ one }) => ({
    role: one(roleModel, {
      fields: [rolePermissionsModel.roleId],
      references: [roleModel.roleId],
    }),
    permission: one(permissionsModel, {
      fields: [rolePermissionsModel.permissionId],
      references: [permissionsModel.id],
    }),
  })
)

export const tenantUserRelations = relations(tenantUserModel, ({ one }) => ({
  tenant: one(tenantModel, {
    fields: [tenantUserModel.tenantId],
    references: [tenantModel.id],
  }),
  user: one(userModel, {
    fields: [tenantUserModel.userId],
    references: [userModel.userId],
  }),
  role: one(roleModel, {
    fields: [tenantUserModel.roleId],
    references: [roleModel.roleId],
  }),
}))

export const tenantRelations = relations(tenantModel, ({ many }) => ({
  tenantUsers: many(tenantUserModel),
  customers: many(customerModel),
  vendors: many(vendorModel),
  orders: many(orderModel),
  packages: many(packageModel),
  accounts: many(accountModel),
  transactions: many(transactionModel),
  generalExpenses: many(generalExpenseModel),
}))

export const customerRelations = relations(customerModel, ({ many, one }) => ({
  tenant: one(tenantModel, {
    fields: [customerModel.tenantId],
    references: [tenantModel.id],
  }),
  orders: many(orderModel),
  packageCustomers: many(packageCustomerModel),
}))

export const vendorRelations = relations(vendorModel, ({ one, many }) => ({
  tenant: one(tenantModel, {
    fields: [vendorModel.tenantId],
    references: [tenantModel.id],
  }),
  orderServices: many(orderServiceModel),
  packageVendorFees: many(packageVendorFeeModel),
}))

export const orderRelations = relations(orderModel, ({ one, many }) => ({
  tenant: one(tenantModel, {
    fields: [orderModel.tenantId],
    references: [tenantModel.id],
  }),
  customer: one(customerModel, {
    fields: [orderModel.customerId],
    references: [customerModel.id],
  }),
  services: many(orderServiceModel),
  tickets: many(ticketModel),
}))

export const orderServiceRelations = relations(
  orderServiceModel,
  ({ one }) => ({
    order: one(orderModel, {
      fields: [orderServiceModel.orderId],
      references: [orderModel.id],
    }),
    vendor: one(vendorModel, {
      fields: [orderServiceModel.vendorId],
      references: [vendorModel.id],
    }),
  })
)

export const ticketRelations = relations(ticketModel, ({ one }) => ({
  order: one(orderModel, {
    fields: [ticketModel.orderId],
    references: [orderModel.id],
  }),
}))

export const packageRelations = relations(packageModel, ({ many, one }) => ({
  tenant: one(tenantModel, {
    fields: [packageModel.tenantId],
    references: [tenantModel.id],
  }),
  customers: many(packageCustomerModel),
  checklists: many(packageChecklistModel),
  vendorFees: many(packageVendorFeeModel),
}))

export const packageCustomerRelations = relations(
  packageCustomerModel,
  ({ one, many }) => ({
    package: one(packageModel, {
      fields: [packageCustomerModel.packageId],
      references: [packageModel.id],
    }),
    customer: one(customerModel, {
      fields: [packageCustomerModel.customerId],
      references: [customerModel.id],
    }),
    installments: many(installmentModel),
    checklistItems: many(packageChecklistItemModel),
  })
)

export const installmentRelations = relations(installmentModel, ({ one }) => ({
  packageCustomer: one(packageCustomerModel, {
    fields: [installmentModel.packageCustomerId],
    references: [packageCustomerModel.id],
  }),
}))

export const packageChecklistRelations = relations(
  packageChecklistModel,
  ({ one, many }) => ({
    package: one(packageModel, {
      fields: [packageChecklistModel.packageId],
      references: [packageModel.id],
    }),
    checklistItems: many(packageChecklistItemModel),
  })
)

export const packageChecklistItemRelations = relations(
  packageChecklistItemModel,
  ({ one }) => ({
    packageCustomer: one(packageCustomerModel, {
      fields: [packageChecklistItemModel.packageCustomerId],
      references: [packageCustomerModel.id],
    }),
    checklist: one(packageChecklistModel, {
      fields: [packageChecklistItemModel.checklistId],
      references: [packageChecklistModel.id],
    }),
  })
)

export const packageVendorFeeRelations = relations(
  packageVendorFeeModel,
  ({ one }) => ({
    package: one(packageModel, {
      fields: [packageVendorFeeModel.packageId],
      references: [packageModel.id],
    }),
    vendor: one(vendorModel, {
      fields: [packageVendorFeeModel.vendorId],
      references: [vendorModel.id],
    }),
  })
)

export const accountRelations = relations(accountModel, ({ one, many }) => ({
  tenant: one(tenantModel, {
    fields: [accountModel.tenantId],
    references: [tenantModel.id],
  }),
  transactions: many(transactionModel),
}))

export const transactionRelations = relations(transactionModel, ({ one }) => ({
  tenant: one(tenantModel, {
    fields: [transactionModel.tenantId],
    references: [tenantModel.id],
  }),
  account: one(accountModel, {
    fields: [transactionModel.accountId],
    references: [accountModel.id],
  }),
}))

export const generalExpenseRelations = relations(
  generalExpenseModel,
  ({ one }) => ({
    tenant: one(tenantModel, {
      fields: [generalExpenseModel.tenantId],
      references: [tenantModel.id],
    }),
  })
)

// ========================
// Types
// ========================
export type User = typeof userModel.$inferSelect
export type NewUser = typeof userModel.$inferInsert
export type Role = typeof roleModel.$inferSelect
export type NewRole = typeof roleModel.$inferInsert
export type Permission = typeof permissionsModel.$inferSelect
export type NewPermission = typeof permissionsModel.$inferInsert
export type Tenant = typeof tenantModel.$inferSelect
export type NewTenant = typeof tenantModel.$inferInsert
export type TenantUser = typeof tenantUserModel.$inferSelect
export type NewTenantUser = typeof tenantUserModel.$inferInsert
export type Customer = typeof customerModel.$inferSelect
export type NewCustomer = typeof customerModel.$inferInsert
export type Vendor = typeof vendorModel.$inferSelect
export type NewVendor = typeof vendorModel.$inferInsert
export type Order = typeof orderModel.$inferSelect
export type NewOrder = typeof orderModel.$inferInsert
export type OrderService = typeof orderServiceModel.$inferSelect
export type NewOrderService = typeof orderServiceModel.$inferInsert
export type Ticket = typeof ticketModel.$inferSelect
export type NewTicket = typeof ticketModel.$inferInsert
export type Package = typeof packageModel.$inferSelect
export type NewPackage = typeof packageModel.$inferInsert
export type PackageCustomer = typeof packageCustomerModel.$inferSelect
export type NewPackageCustomer = typeof packageCustomerModel.$inferInsert
export type Installment = typeof installmentModel.$inferSelect
export type NewInstallment = typeof installmentModel.$inferInsert
export type PackageChecklist = typeof packageChecklistModel.$inferSelect
export type NewPackageChecklist = typeof packageChecklistModel.$inferInsert
export type PackageChecklistItem = typeof packageChecklistItemModel.$inferSelect
export type NewPackageChecklistItem =
  typeof packageChecklistItemModel.$inferInsert
export type PackageVendorFee = typeof packageVendorFeeModel.$inferSelect
export type NewPackageVendorFee = typeof packageVendorFeeModel.$inferInsert
export type Account = typeof accountModel.$inferSelect
export type NewAccount = typeof accountModel.$inferInsert
export type Transaction = typeof transactionModel.$inferSelect
export type NewTransaction = typeof transactionModel.$inferInsert
export type GeneralExpense = typeof generalExpenseModel.$inferSelect
export type NewGeneralExpense = typeof generalExpenseModel.$inferInsert












// import { relations } from 'drizzle-orm'
// import {
//   boolean,
//   pgTable,
//   serial,
//   timestamp,
//   varchar,
//   text,
//   decimal,
//   date,
//   uuid,
//   pgEnum,
//   integer,
// } from 'drizzle-orm/pg-core'

// // ========================
// // Enums
// // ========================
// export const orderTypeEnum = pgEnum('order_type', [
//   'ticket',
//   'visa',
//   'reschedule',
//   'cancellation',
// ])
// export const orderStatusEnum = pgEnum('order_status', [
//   'pending',
//   'confirmed',
//   'completed',
//   'cancelled',
// ])
// export const packageTypeEnum = pgEnum('package_type', ['hajj', 'umrah'])
// export const transactionTypeEnum = pgEnum('transaction_type', [
//   'credit',
//   'debit',
// ])
// export const accountTypeEnum = pgEnum('account_type', [
//   'cash',
//   'bank',
//   'customer',
//   'vendor',
// ])
// export const checklistStatusEnum = pgEnum('checklist_status', [
//   'pending',
//   'completed',
//   'skipped',
// ])

// // ========================
// // Roles & Permissions
// // ========================
// export const roleModel = pgTable('roles', {
//   roleId: serial('role_id').primaryKey(),
//   roleName: varchar('role_name', { length: 50 }).notNull(),
// })

// export const userModel = pgTable('users', {
//   userId: serial('user_id').primaryKey(),
//   username: varchar('username', { length: 50 }).notNull().unique(),
//   password: varchar('password', { length: 255 }).notNull(),
//   active: boolean('active').notNull().default(true),
//   isPasswordResetRequired: boolean('is_password_reset_required').default(true),
//   createdAt: timestamp('created_at').defaultNow(),
//   updatedAt: timestamp('updated_at').defaultNow(),
// })

// export const permissionsModel = pgTable('permissions', {
//   id: serial('id').primaryKey(),
//   name: varchar('name', { length: 50 }).notNull().unique(),
// })

// export const rolePermissionsModel = pgTable('role_permissions', {
//   roleId: integer('role_id').references(() => roleModel.roleId),
//   permissionId: integer('permission_id')
//     .notNull()
//     .references(() => permissionsModel.id),
// })

// // ========================
// // Tenants
// // ========================
// export const tenantModel = pgTable('tenants', {
//   id: uuid('id').defaultRandom().primaryKey(),
//   name: varchar('name', { length: 100 }).notNull(),
//   domain: varchar('domain', { length: 100 }).unique(),
//   status: varchar('status', { length: 20 }).default('active'),
//   createdAt: timestamp('created_at').defaultNow(),
//   updatedAt: timestamp('updated_at').defaultNow(),
// })

// // ========================
// // Tenant Users (replaces user_roles)
// // ========================
// export const tenantUserModel = pgTable('tenant_users', {
//   id: uuid('id').defaultRandom().primaryKey(),
//   tenantId: uuid('tenant_id')
//     .notNull()
//     .references(() => tenantModel.id),
//   userId: integer('user_id')
//     .notNull()
//     .references(() => userModel.userId),
//   roleId: integer('role_id')
//     .notNull()
//     .references(() => roleModel.roleId),
//   createdAt: timestamp('created_at').defaultNow(),
// })

// // ========================
// // Customers
// // ========================
// export const customerModel = pgTable('customers', {
//   id: uuid('id').defaultRandom().primaryKey(),
//   tenantId: uuid('tenant_id').references(() => tenantModel.id),
//   name: varchar('name', { length: 100 }).notNull(),
//   email: varchar('email', { length: 100 }),
//   phone: varchar('phone', { length: 20 }),
//   passportNumber: varchar('passport_number', { length: 50 }),
//   address: text('address'),
//   createdAt: timestamp('created_at').defaultNow(),
// })

// // ========================
// // Vendors
// // ========================
// export const vendorModel = pgTable('vendors', {
//   id: uuid('id').defaultRandom().primaryKey(),
//   tenantId: uuid('tenant_id').references(() => tenantModel.id),
//   name: varchar('name', { length: 100 }).notNull(),
//   type: varchar('type', { length: 50 }),
//   contactDetails: text('contact_details'),
//   createdAt: timestamp('created_at').defaultNow(),
// })

// // ========================
// // Orders
// // ========================
// export const orderModel = pgTable('orders', {
//   id: uuid('id').defaultRandom().primaryKey(),
//   tenantId: uuid('tenant_id').references(() => tenantModel.id),
//   customerId: uuid('customer_id').references(() => customerModel.id),
//   orderType: orderTypeEnum('order_type'),
//   status: orderStatusEnum('status').default('pending'),
//   totalAmount: decimal('total_amount', { precision: 10, scale: 2 }),
//   dueAmount: decimal('due_amount', { precision: 10, scale: 2 }),
//   travelDate: date('travel_date'),
//   createdAt: timestamp('created_at').defaultNow(),
// })

// export const orderServiceModel = pgTable('order_services', {
//   id: uuid('id').defaultRandom().primaryKey(),
//   orderId: uuid('order_id').references(() => orderModel.id),
//   vendorId: uuid('vendor_id').references(() => vendorModel.id),
//   serviceType: varchar('service_type', { length: 50 }),
//   serviceCost: decimal('service_cost', { precision: 10, scale: 2 }),
//   procurementStatus: varchar('procurement_status', { length: 30 }).default(
//     'pending'
//   ),
// })

// export const ticketModel = pgTable('tickets', {
//   id: uuid('id').defaultRandom().primaryKey(),
//   orderId: uuid('order_id').references(() => orderModel.id),
//   pnr: varchar('pnr', { length: 20 }),
//   airline: varchar('airline', { length: 50 }),
//   origin: varchar('origin', { length: 100 }), // ← new
//   destination: varchar('destination', { length: 100 }), // ← new
//   departureDate: date('departure_date'),
//   arrivalDate: date('arrival_date'),
//   seatClass: varchar('seat_class', { length: 20 }),
//   ticketStatus: varchar('ticket_status', { length: 20 }).default('pending'),
// })

// // ========================
// // Packages
// // ========================
// export const packageModel = pgTable('packages', {
//   id: uuid('id').defaultRandom().primaryKey(),
//   tenantId: uuid('tenant_id').references(() => tenantModel.id),
//   name: varchar('name', { length: 100 }).notNull(),
//   packageType: packageTypeEnum('package_type'),
//   price: decimal('price', { precision: 10, scale: 2 }),
//   enrollmentDeadline: date('enrollment_deadline'),
//   createdAt: timestamp('created_at').defaultNow(),
// })

// export const packageCustomerModel = pgTable('package_customers', {
//   id: uuid('id').defaultRandom().primaryKey(),
//   packageId: uuid('package_id').references(() => packageModel.id),
//   customerId: uuid('customer_id').references(() => customerModel.id),
//   status: varchar('status', { length: 20 }).default('active'),
//   totalFee: decimal('total_fee', { precision: 10, scale: 2 }),
//   balanceDue: decimal('balance_due', { precision: 10, scale: 2 }),
//   createdAt: timestamp('created_at').defaultNow(),
// })

// export const installmentModel = pgTable('installments', {
//   id: uuid('id').defaultRandom().primaryKey(),
//   packageCustomerId: uuid('package_customer_id').references(
//     () => packageCustomerModel.id
//   ),
//   amount: decimal('amount', { precision: 10, scale: 2 }),
//   dueDate: date('due_date'),
//   paidAt: timestamp('paid_at'),
//   status: varchar('status', { length: 20 }).default('pending'),
// })

// export const packageChecklistModel = pgTable('package_checklists', {
//   id: uuid('id').defaultRandom().primaryKey(),
//   packageId: uuid('package_id').references(() => packageModel.id),
//   taskName: varchar('task_name', { length: 100 }),
//   description: text('description'),
//   required: boolean('required').default(true),
//   createdAt: timestamp('created_at').defaultNow(),
// })

// export const packageChecklistItemModel = pgTable('package_checklist_items', {
//   id: uuid('id').defaultRandom().primaryKey(),
//   packageCustomerId: uuid('package_customer_id')
//     .notNull()
//     .references(() => packageCustomerModel.id),
//   checklistId: uuid('checklist_id')
//     .notNull()
//     .references(() => packageChecklistModel.id),
//   status: checklistStatusEnum('status').default('pending'),
//   completedAt: timestamp('completed_at'),
//   createdAt: timestamp('created_at').defaultNow(),
// })

// export const packageVendorFeeModel = pgTable('package_vendor_fees', {
//   id: uuid('id').defaultRandom().primaryKey(),
//   packageId: uuid('package_id').references(() => packageModel.id),
//   vendorId: uuid('vendor_id').references(() => vendorModel.id),
//   feeType: varchar('fee_type', { length: 50 }),
//   amount: decimal('amount', { precision: 10, scale: 2 }),
//   paidAt: timestamp('paid_at'),
// })

// // ========================
// // Finance
// // ========================
// export const accountModel = pgTable('accounts', {
//   id: uuid('id').defaultRandom().primaryKey(),
//   tenantId: uuid('tenant_id').references(() => tenantModel.id),
//   accountType: accountTypeEnum('account_type'),
//   name: varchar('name', { length: 100 }),
//   balance: decimal('balance', { precision: 10, scale: 2 }).default('0'),
// })

// export const transactionModel = pgTable('transactions', {
//   id: uuid('id').defaultRandom().primaryKey(),
//   tenantId: uuid('tenant_id').references(() => tenantModel.id),
//   accountId: uuid('account_id').references(() => accountModel.id),
//   referenceType: varchar('reference_type', { length: 30 }),
//   referenceId: uuid('reference_id'),
//   amount: decimal('amount', { precision: 10, scale: 2 }),
//   transactionType: transactionTypeEnum('transaction_type'),
//   category: varchar('category', { length: 50 }),
//   transactionDate: date('transaction_date'),
//   status: varchar('status', { length: 20 }).default('pending'),
// })

// export const generalExpenseModel = pgTable('general_expenses', {
//   id: uuid('id').defaultRandom().primaryKey(),
//   tenantId: uuid('tenant_id').references(() => tenantModel.id),
//   category: varchar('category', { length: 50 }),
//   amount: decimal('amount', { precision: 10, scale: 2 }),
//   description: text('description'),
//   incurredAt: date('incurred_at'),
// })

// // ========================
// // Relations
// // ========================
// export const roleRelations = relations(roleModel, ({ many }) => ({
//   rolePermissions: many(rolePermissionsModel),
//   tenantUsers: many(tenantUserModel),
// }))

// export const userRelations = relations(userModel, ({ many }) => ({
//   tenantUsers: many(tenantUserModel),
// }))

// export const permissionsRelations = relations(permissionsModel, ({ many }) => ({
//   rolePermissions: many(rolePermissionsModel),
// }))

// export const rolePermissionsRelations = relations(
//   rolePermissionsModel,
//   ({ one }) => ({
//     role: one(roleModel, {
//       fields: [rolePermissionsModel.roleId],
//       references: [roleModel.roleId],
//     }),
//     permission: one(permissionsModel, {
//       fields: [rolePermissionsModel.permissionId],
//       references: [permissionsModel.id],
//     }),
//   })
// )

// export const tenantUserRelations = relations(tenantUserModel, ({ one }) => ({
//   tenant: one(tenantModel, {
//     fields: [tenantUserModel.tenantId],
//     references: [tenantModel.id],
//   }),
//   user: one(userModel, {
//     fields: [tenantUserModel.userId],
//     references: [userModel.userId],
//   }),
//   role: one(roleModel, {
//     fields: [tenantUserModel.roleId],
//     references: [roleModel.roleId],
//   }),
// }))

// export const tenantRelations = relations(tenantModel, ({ many }) => ({
//   tenantUsers: many(tenantUserModel),
//   customers: many(customerModel),
//   vendors: many(vendorModel),
//   orders: many(orderModel),
//   packages: many(packageModel),
//   accounts: many(accountModel),
//   transactions: many(transactionModel),
//   generalExpenses: many(generalExpenseModel),
// }))

// export const customerRelations = relations(customerModel, ({ many, one }) => ({
//   tenant: one(tenantModel, {
//     fields: [customerModel.tenantId],
//     references: [tenantModel.id],
//   }),
//   orders: many(orderModel),
//   packageCustomers: many(packageCustomerModel),
// }))

// export const vendorRelations = relations(vendorModel, ({ one, many }) => ({
//   tenant: one(tenantModel, {
//     fields: [vendorModel.tenantId],
//     references: [tenantModel.id],
//   }),
//   orderServices: many(orderServiceModel),
//   packageVendorFees: many(packageVendorFeeModel),
// }))

// export const orderRelations = relations(orderModel, ({ one, many }) => ({
//   tenant: one(tenantModel, {
//     fields: [orderModel.tenantId],
//     references: [tenantModel.id],
//   }),
//   customer: one(customerModel, {
//     fields: [orderModel.customerId],
//     references: [customerModel.id],
//   }),
//   services: many(orderServiceModel),
//   tickets: many(ticketModel),
// }))

// export const orderServiceRelations = relations(
//   orderServiceModel,
//   ({ one }) => ({
//     order: one(orderModel, {
//       fields: [orderServiceModel.orderId],
//       references: [orderModel.id],
//     }),
//     vendor: one(vendorModel, {
//       fields: [orderServiceModel.vendorId],
//       references: [vendorModel.id],
//     }),
//   })
// )

// export const ticketRelations = relations(ticketModel, ({ one }) => ({
//   order: one(orderModel, {
//     fields: [ticketModel.orderId],
//     references: [orderModel.id],
//   }),
// }))

// export const packageRelations = relations(packageModel, ({ many, one }) => ({
//   tenant: one(tenantModel, {
//     fields: [packageModel.tenantId],
//     references: [tenantModel.id],
//   }),
//   customers: many(packageCustomerModel),
//   checklists: many(packageChecklistModel),
//   vendorFees: many(packageVendorFeeModel),
// }))

// export const packageCustomerRelations = relations(
//   packageCustomerModel,
//   ({ one, many }) => ({
//     package: one(packageModel, {
//       fields: [packageCustomerModel.packageId],
//       references: [packageModel.id],
//     }),
//     customer: one(customerModel, {
//       fields: [packageCustomerModel.customerId],
//       references: [customerModel.id],
//     }),
//     installments: many(installmentModel),
//     checklistItems: many(packageChecklistItemModel),
//   })
// )

// export const installmentRelations = relations(installmentModel, ({ one }) => ({
//   packageCustomer: one(packageCustomerModel, {
//     fields: [installmentModel.packageCustomerId],
//     references: [packageCustomerModel.id],
//   }),
// }))

// export const packageChecklistRelations = relations(
//   packageChecklistModel,
//   ({ one, many }) => ({
//     package: one(packageModel, {
//       fields: [packageChecklistModel.packageId],
//       references: [packageModel.id],
//     }),
//     checklistItems: many(packageChecklistItemModel),
//   })
// )

// export const packageChecklistItemRelations = relations(
//   packageChecklistItemModel,
//   ({ one }) => ({
//     packageCustomer: one(packageCustomerModel, {
//       fields: [packageChecklistItemModel.packageCustomerId],
//       references: [packageCustomerModel.id],
//     }),
//     checklist: one(packageChecklistModel, {
//       fields: [packageChecklistItemModel.checklistId],
//       references: [packageChecklistModel.id],
//     }),
//   })
// )

// export const packageVendorFeeRelations = relations(
//   packageVendorFeeModel,
//   ({ one }) => ({
//     package: one(packageModel, {
//       fields: [packageVendorFeeModel.packageId],
//       references: [packageModel.id],
//     }),
//     vendor: one(vendorModel, {
//       fields: [packageVendorFeeModel.vendorId],
//       references: [vendorModel.id],
//     }),
//   })
// )

// export const accountRelations = relations(accountModel, ({ one, many }) => ({
//   tenant: one(tenantModel, {
//     fields: [accountModel.tenantId],
//     references: [tenantModel.id],
//   }),
//   transactions: many(transactionModel),
// }))

// export const transactionRelations = relations(transactionModel, ({ one }) => ({
//   tenant: one(tenantModel, {
//     fields: [transactionModel.tenantId],
//     references: [tenantModel.id],
//   }),
//   account: one(accountModel, {
//     fields: [transactionModel.accountId],
//     references: [accountModel.id],
//   }),
// }))

// export const generalExpenseRelations = relations(
//   generalExpenseModel,
//   ({ one }) => ({
//     tenant: one(tenantModel, {
//       fields: [generalExpenseModel.tenantId],
//       references: [tenantModel.id],
//     }),
//   })
// )

// // ========================
// // Types
// // ========================
// export type User = typeof userModel.$inferSelect
// export type NewUser = typeof userModel.$inferInsert
// export type Role = typeof roleModel.$inferSelect
// export type NewRole = typeof roleModel.$inferInsert
// export type Permission = typeof permissionsModel.$inferSelect
// export type NewPermission = typeof permissionsModel.$inferInsert
// export type Tenant = typeof tenantModel.$inferSelect
// export type NewTenant = typeof tenantModel.$inferInsert
// export type TenantUser = typeof tenantUserModel.$inferSelect
// export type NewTenantUser = typeof tenantUserModel.$inferInsert
// export type Customer = typeof customerModel.$inferSelect
// export type NewCustomer = typeof customerModel.$inferInsert
// export type Vendor = typeof vendorModel.$inferSelect
// export type NewVendor = typeof vendorModel.$inferInsert
// export type Order = typeof orderModel.$inferSelect
// export type NewOrder = typeof orderModel.$inferInsert
// export type OrderService = typeof orderServiceModel.$inferSelect
// export type NewOrderService = typeof orderServiceModel.$inferInsert
// export type Ticket = typeof ticketModel.$inferSelect
// export type NewTicket = typeof ticketModel.$inferInsert
// export type Package = typeof packageModel.$inferSelect
// export type NewPackage = typeof packageModel.$inferInsert
// export type PackageCustomer = typeof packageCustomerModel.$inferSelect
// export type NewPackageCustomer = typeof packageCustomerModel.$inferInsert
// export type Installment = typeof installmentModel.$inferSelect
// export type NewInstallment = typeof installmentModel.$inferInsert
// export type PackageChecklist = typeof packageChecklistModel.$inferSelect
// export type NewPackageChecklist = typeof packageChecklistModel.$inferInsert
// export type PackageChecklistItem = typeof packageChecklistItemModel.$inferSelect
// export type NewPackageChecklistItem =
//   typeof packageChecklistItemModel.$inferInsert
// export type PackageVendorFee = typeof packageVendorFeeModel.$inferSelect
// export type NewPackageVendorFee = typeof packageVendorFeeModel.$inferInsert
// export type Account = typeof accountModel.$inferSelect
// export type NewAccount = typeof accountModel.$inferInsert
// export type Transaction = typeof transactionModel.$inferSelect
// export type NewTransaction = typeof transactionModel.$inferInsert
// export type GeneralExpense = typeof generalExpenseModel.$inferSelect
// export type NewGeneralExpense = typeof generalExpenseModel.$inferInsert
