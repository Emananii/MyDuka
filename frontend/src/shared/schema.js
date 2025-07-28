// src/shared/schema.js
import { z } from "zod";

// Helper function to transform date strings reliably
const dateStringTransform = z.string().transform((str, ctx) => {
  const date = new Date(str);
  if (isNaN(date.getTime())) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Invalid date string",
    });
    return z.NEVER;
  }
  return date;
});

// --- Base Schemas (Reusable for all models inheriting BaseModel) ---
export const baseModelSchema = z.object({
  id: z.number().int().positive(),
  is_deleted: z.boolean().default(false),
  // FIX: Make created_at and updated_at optional and nullable for robustness
  created_at: dateStringTransform.nullable().optional(), 
  updated_at: dateStringTransform.nullable().optional(), 
});

// --- Enums from your Models ---
// ⭐ FIX: Removed 'user' from the userRoleEnum definition ⭐
export const userRoleEnum = z.enum(['merchant', 'admin', 'clerk', 'cashier']);
export const paymentStatusEnum = z.enum(['paid', 'unpaid']);
export const supplyRequestStatusEnum = z.enum(['pending', 'approved', 'declined']);
export const stockTransferStatusEnum = z.enum(['pending', 'approved', 'rejected']);


// --- Core Entity Schemas (for fetched data, often nested) ---

export const storeSchema = baseModelSchema.extend({
  name: z.string(),
  address: z.string().nullable(),
});

export const userSchema = baseModelSchema.extend({
  name: z.string(),
  email: z.string().email(),
  role: userRoleEnum, // Using the updated enum
  is_active: z.boolean(),
  store_id: z.number().int().positive().nullable(),
  created_by: z.number().int().positive().nullable(),
});

export const categorySchema = baseModelSchema.extend({
  name: z.string(),
  description: z.string().nullable(),
});

export const productSchema = baseModelSchema.extend({
  name: z.string(),
  sku: z.string().nullable(),
  unit: z.string(),
  description: z.string().nullable(),
  category_id: z.number().int().positive().nullable(),
  image_url: z.string().url().nullable().optional(),
});

export const storeProductSchema = baseModelSchema.extend({
  store_id: z.number().int().positive().nullable(),
  product_id: z.number().int().positive().nullable(),
  quantity_in_stock: z.number().int().nonnegative(),
  quantity_spoilt: z.number().int().nonnegative(),
  low_stock_threshold: z.number().int().nonnegative(),
  price: z.number(),
  // FIX: Make last_updated optional and nullable
  last_updated: dateStringTransform.nullable().optional(), 
  product: productSchema,
});

export const supplierSchema = baseModelSchema.extend({
  name: z.string(),
  contact_person: z.string().nullable(),
  phone: z.string().nullable(),
  email: z.string().email().nullable(),
  address: z.string().nullable(),
  notes: z.string().nullable(),
});

export const insertSaleItemSchema = z.object({
  store_product_id: z.number().int().positive("Store Product ID is required."),
  quantity: z.number().int().min(1, "Quantity must be at least 1."),
  price_at_sale: z.number().nonnegative("Price at sale cannot be negative."),
});

export const insertSaleSchema = z.object({
  store_id: z.number().int().positive("Store ID is required."),
  cashier_id: z.number().int().positive("Cashier ID is required."),
  payment_status: paymentStatusEnum.default("paid"),
  sale_items: z.array(insertSaleItemSchema).min(1, "A sale must have at least one item."),
});

export const posProductDisplaySchema = z.object({
  store_product_id: z.number().int().positive(), 
  product_id: z.number().int().positive(), 
  product_name: z.string(), 
  sku: z.string().nullable(), 
  unit: z.string(), 
  price: z.number().nonnegative(), 
  quantity_in_stock: z.number().int().nonnegative(), 
  low_stock_threshold: z.number().int().nonnegative(), 
  last_updated: dateStringTransform.nullable().optional(),
  image_url: z.string().url().nullable().optional(),
  created_at: dateStringTransform.nullable().optional(),
  updated_at: dateStringTransform.nullable().optional(),
  is_deleted: z.boolean().optional(),
});
export const posProductListSchema = z.array(posProductDisplaySchema);


export const saleItemFetchedSchema = baseModelSchema.extend({
  sale_id: z.number().int().positive(),
  store_product_id: z.number().int().positive(),
  quantity: z.number().int().nonnegative(),
  price_at_sale: z.number(),
  store_product: storeProductSchema,
});

export const saleHistoryItemSchema = baseModelSchema.extend({
  store_id: z.number().int().positive().nullable(),
  cashier_id: z.number().int().positive().nullable(),
  payment_status: paymentStatusEnum,
  total: z.number(),
  cashier: userSchema.pick({ id: true, name: true, email: true }).optional(),
  store: storeSchema.pick({ id: true, name: true }).optional(),
});
export const saleHistoryListSchema = z.array(saleHistoryItemSchema);

export const saleDetailsSchema = baseModelSchema.extend({
  store_id: z.number().int().positive().nullable(),
  cashier_id: z.number().int().positive().nullable(),
  payment_status: paymentStatusEnum,
  total: z.number(),
  notes: z.string().nullable().optional(),
  cashier: userSchema.pick({ id: true, name: true, email: true, role: true }).optional(),
  store: storeSchema.pick({ id: true, name: true, address: true }).optional(),
  sale_items: z.array(saleItemFetchedSchema).min(1),
});


export const insertUserSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  email: z.string().email("Invalid email address."),
  password: z.string().min(8, "Password must be at least 8 characters.").optional(),
  role: userRoleEnum,
  is_active: z.boolean().default(true),
  store_id: z.coerce.number().int().positive("Store ID is required for non-merchant roles.").nullable(),
  created_by: z.coerce.number().int().positive("Creator ID is required.").nullable(),
});
export const editUserSchema = insertUserSchema.extend({
    password: z.string().min(8, "Password must be at least 8 characters.").or(z.literal("")).optional(),
});

export const insertStoreSchema = z.object({
  name: z.string().min(2, "Store name must be at least 2 characters."),
  address: z.string().min(5, "Address must be at least 5 characters.").nullable(),
});
export const editStoreSchema = insertStoreSchema.extend({});

export const insertCategorySchema = z.object({
  name: z.string().min(2, "Category name must be at least 2 characters."),
  description: z.string().nullable().optional(),
});
export const editCategorySchema = insertCategorySchema.extend({});

export const insertProductSchema = z.object({
  name: z.string().min(2, "Product name must be at least 2 characters."),
  sku: z.string().nullable(),
  unit: z.string().min(1, "Unit is required."),
  description: z.string().nullable().optional(),
  category_id: z.coerce.number().int().positive("Category is required.").nullable(),
  image_url: z.string().url().nullable().optional(),
});
export const editProductSchema = insertProductSchema.extend({});

export const insertStoreProductSchema = z.object({
  store_id: z.coerce.number().int().positive("Store ID is required."),
  product_id: z.coerce.number().int().positive("Product ID is required."),
  quantity_in_stock: z.coerce.number().int().nonnegative("Stock quantity cannot be negative.").default(0),
  quantity_spoilt: z.coerce.number().int().nonnegative("Spoilt quantity cannot be negative.").default(0),
  low_stock_threshold: z.coerce.number().int().nonnegative("Low stock threshold cannot be negative.").default(10),
  price: z.coerce.number().nonnegative("Price cannot be negative."),
});
export const editStoreProductSchema = insertStoreProductSchema.extend({});

export const insertSupplierSchema = z.object({
  name: z.string().min(2, "Supplier name must be at least 2 characters."),
  contact_person: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().email("Invalid email address.").nullable().optional(),
  address: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});
export const editSupplierSchema = insertSupplierSchema.extend({});

export const insertPurchaseSchema = z.object({
  supplier_id: z.coerce.number().int().positive("Supplier is required.").nullable(),
  store_id: z.coerce.number().int().positive("Store is required."),
  date: dateStringTransform.optional(),
  reference_number: z.string().nullable().optional(),
  is_paid: z.boolean().default(false),
  notes: z.string().nullable().optional(),
});
export const editPurchaseSchema = insertPurchaseSchema.extend({});

export const insertPurchaseItemSchema = z.object({
  purchase_id: z.coerce.number().int().positive("Purchase ID is required."),
  product_id: z.coerce.number().int().positive("Product ID is required."),
  quantity: z.coerce.number().int().min(1, "Quantity must be at least 1."),
  unit_cost: z.coerce.number().nonnegative("Unit cost cannot be negative."),
});
export const editPurchaseItemSchema = insertPurchaseItemSchema.extend({});

export const insertSupplyRequestSchema = z.object({
  store_id: z.coerce.number().int().positive("Store ID is required."),
  product_id: z.coerce.number().int().positive("Product ID is required."),
  clerk_id: z.coerce.number().int().positive("Clerk ID is required."),
  requested_quantity: z.coerce.number().int().min(1, "Requested quantity must be at least 1."),
  status: supplyRequestStatusEnum.default('pending'),
  admin_id: z.coerce.number().int().positive().nullable(),
  admin_response: z.string().nullable().optional(),
});
export const editSupplyRequestSchema = insertSupplyRequestSchema.extend({
    status: supplyRequestStatusEnum,
    admin_id: z.coerce.number().int().positive("Admin ID is required for status change.").nullable(),
    admin_response: z.string().nullable().optional(),
});


export const insertStockTransferSchema = z.object({
  from_store_id: z.coerce.number().int().positive("Origin store is required."),
  to_store_id: z.coerce.number().int().positive("Destination store is required."),
  initiated_by: z.coerce.number().int().positive("Initiator is required."),
  approved_by: z.coerce.number().int().positive().nullable(),
  status: stockTransferStatusEnum.default('pending'),
  transfer_date: dateStringTransform.optional(),
  notes: z.string().nullable().optional(),
  items: z.array(
    z.object({
      product_id: z.coerce.number().int().positive(),
      quantity: z.coerce.number().int().min(1),
    })
  ).min(1, "At least one product must be included in the transfer"),
});
export const editStockTransferSchema = insertStockTransferSchema.extend({
    status: stockTransferStatusEnum,
    approved_by: z.coerce.number().int().positive("Approver ID is required for status change.").nullable(),
});

export const stockTransferItemSchema = baseModelSchema.extend({
  stock_transfer_id: z.number().int().positive().nullable(),
  product_id: z.number().int().positive().nullable(),
  quantity: z.number().int().nonnegative(),
  product: productSchema.optional(),
});
