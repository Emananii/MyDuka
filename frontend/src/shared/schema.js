// src/lib/schema.js
import { z } from "zod";

// --- Base Schemas (Reusable for all models inheriting BaseModel) ---
export const baseModelSchema = z.object({
  id: z.number().int().positive(),
  is_deleted: z.boolean().default(false), // Assuming backend always returns this, or defaults if not present
  created_at: z.string().datetime(), // ISO 8601 string
  updated_at: z.string().datetime(), // ISO 8601 string
});

// --- Enums from your Models ---
export const userRoleEnum = z.enum(['merchant', 'admin', 'clerk', 'cashier']);
export const paymentStatusEnum = z.enum(['paid', 'unpaid']);
export const supplyRequestStatusEnum = z.enum(['pending', 'approved', 'declined']);
export const stockTransferStatusEnum = z.enum(['pending', 'approved', 'rejected']);


// --- Core Entity Schemas (for fetched data, often nested) ---

export const storeSchema = baseModelSchema.extend({
  name: z.string(),
  address: z.string().nullable(),
  // Relationships are typically not directly in the schema unless explicitly nested by backend serializer
  // users: z.array(userSchema).optional(), // Example if backend nests all users for a store
});

export const userSchema = baseModelSchema.extend({
  name: z.string(),
  email: z.string().email(),
  // password_hash is sensitive and should never be exposed to frontend
  role: userRoleEnum,
  is_active: z.boolean(),
  store_id: z.number().int().positive().nullable(), // Nullable for Merchant role
  created_by: z.number().int().positive().nullable(),
  // creator: userSchema.optional(), // If backend nests creator details
});

export const categorySchema = baseModelSchema.extend({
  name: z.string(),
  description: z.string().nullable(),
  // products: z.array(productSchema).optional(), // If backend nests products
});

// --- UPDATED: productSchema to include image_url as per your model and frontend needs ---
export const productSchema = baseModelSchema.extend({
  name: z.string(),
  sku: z.string().nullable(), // Unique=True in DB, but nullable
  unit: z.string(),
  description: z.string().nullable(),
  category_id: z.number().int().positive().nullable(),
  image_url: z.string().url().nullable().optional(), // URL for the product image, optional since it can be null
});

// --- UPDATED: storeProductSchema to nest productSchema ---
export const storeProductSchema = baseModelSchema.extend({
  store_id: z.number().int().positive().nullable(),
  product_id: z.number().int().positive().nullable(),
  quantity_in_stock: z.number().int().nonnegative(),
  quantity_spoilt: z.number().int().nonnegative(),
  low_stock_threshold: z.number().int().nonnegative(),
  price: z.number(), // db.Numeric(10, 2) maps to number
  last_updated: z.string().datetime(),
  product: productSchema, // This should be required if your backend always nests the base product details with StoreProduct
  // store: storeSchema.optional(), // If your backend nests the store details
});

export const supplierSchema = baseModelSchema.extend({
  name: z.string(),
  contact_person: z.string().nullable(),
  phone: z.string().nullable(),
  email: z.string().email().nullable(),
  address: z.string().nullable(),
  notes: z.string().nullable(),
});

// --- Sales & POS Schemas ---

// For POSTing to /api/sales - individual item in the sale_items array
export const insertSaleItemSchema = z.object({
  store_product_id: z.number().int().positive("Store Product ID is required."),
  quantity: z.number().int().min(1, "Quantity must be at least 1."),
  price_at_sale: z.number().nonnegative("Price at sale cannot be negative."),
});

// For POSTing to /api/sales - the main sale payload
export const insertSaleSchema = z.object({
  store_id: z.number().int().positive("Store ID is required."),
  cashier_id: z.number().int().positive("Cashier ID is required."),
  payment_status: paymentStatusEnum.default("paid"),
  // is_deleted is handled by backend default for new creations
  sale_items: z.array(insertSaleItemSchema).min(1, "A sale must have at least one item."),
  // `total` is a hybrid_property, calculated by backend, not sent by frontend for creation
});

// For fetching products for POS search (GET /api/inventory/stock)
// This schema assumes your backend joins Product and StoreProduct data into a FLAT structure.
// If your backend changes to return nested StoreProduct/Product, this schema will need adjustment
// or you'll use storeProductSchema directly for inventory.
export const posProductDisplaySchema = z.object({
  store_product_id: z.number().int().positive(), // The ID of the StoreProduct instance
  product_id: z.number().int().positive(), // The ID of the base Product
  product_name: z.string(), // From Product.name
  sku: z.string().nullable(), // From Product.sku
  unit: z.string(), // From Product.unit
  price: z.number().nonnegative(), // From StoreProduct.price
  quantity_in_stock: z.number().int().nonnegative(), // From StoreProduct.quantity_in_stock
  low_stock_threshold: z.number().int().nonnegative(), // From StoreProduct.low_stock_threshold
  last_updated: z.string().nullable(), // From StoreProduct.last_updated
  image_url: z.string().url().nullable().optional(), // From Product.image_url
  // Additional fields from BaseModel if your backend sends them for these flat objects
  // These might be optional if not always returned by the specific endpoint:
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
  is_deleted: z.boolean().optional(),
});
export const posProductListSchema = z.array(posProductDisplaySchema);


// --- UPDATED: For Sale details or individual sale items fetched from backend ---
// This now correctly nests store_product using the full storeProductSchema
export const saleItemFetchedSchema = baseModelSchema.extend({
  sale_id: z.number().int().positive(),
  store_product_id: z.number().int().positive(),
  quantity: z.number().int().nonnegative(),
  price_at_sale: z.number(),
  // --- IMPORTANT CHANGE HERE ---
  // If backend nests the full StoreProduct with its Product details, this should be required
  store_product: storeProductSchema, // This now expects a full nested StoreProduct object
});

// For Sale history list (GET /api/sales)
export const saleHistoryItemSchema = baseModelSchema.extend({
  store_id: z.number().int().positive().nullable(),
  cashier_id: z.number().int().positive().nullable(),
  payment_status: paymentStatusEnum,
  total: z.number(), // The calculated total from hybrid_property
  // Nested relationships (often simplified for lists)
  cashier: userSchema.pick({ id: true, name: true, email: true }).optional(),
  store: storeSchema.pick({ id: true, name: true }).optional(),
});
export const saleHistoryListSchema = z.array(saleHistoryItemSchema);

// --- UPDATED: For full Sale details (GET /api/sales/<id>) ---
// This schema now relies on the correctly nested saleItemFetchedSchema
export const saleDetailsSchema = baseModelSchema.extend({
  store_id: z.number().int().positive().nullable(),
  cashier_id: z.number().int().positive().nullable(),
  payment_status: paymentStatusEnum,
  total: z.number(),
  notes: z.string().nullable().optional(), // Assuming a `notes` field might be added to Sale model
  cashier: userSchema.pick({ id: true, name: true, email: true, role: true }).optional(),
  store: storeSchema.pick({ id: true, name: true, address: true }).optional(),
  sale_items: z.array(saleItemFetchedSchema).min(1), // Now uses the updated saleItemFetchedSchema
});


// --- Form Validation Schemas (for frontend forms/inputs) ---

// User Form Validation (for creating/editing users)
export const insertUserSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  email: z.string().email("Invalid email address."),
  password: z.string().min(8, "Password must be at least 8 characters.").optional(), // Only required on create, not update
  role: userRoleEnum,
  is_active: z.boolean().default(true),
  store_id: z.coerce.number().int().positive("Store ID is required for non-merchant roles.").nullable(),
  created_by: z.coerce.number().int().positive("Creator ID is required.").nullable(), // Only for backend logic, not frontend input
});
export const editUserSchema = insertUserSchema.extend({
    password: z.string().min(8, "Password must be at least 8 characters.").optional().or(z.literal("")), // Optional for edit, can be empty
    // Password hash is handled by backend, so we send the plain password if updated
});

// Store Form Validation
export const insertStoreSchema = z.object({
  name: z.string().min(2, "Store name must be at least 2 characters."),
  address: z.string().min(5, "Address must be at least 5 characters.").nullable(), // Nullable based on model
  contact_person: z.string().optional(), // Not in model, remove or add to model
  phone: z.string().optional(), // Not in model, remove or add to model
  notes: z.string().optional(), // Not in model, remove or add to model
  is_active: z.boolean().default(true), // Not in model, remove or add to model
});
export const editStoreSchema = insertStoreSchema.extend({});

// Category Form Validation
export const insertCategorySchema = z.object({
  name: z.string().min(2, "Category name must be at least 2 characters."),
  description: z.string().nullable().optional(), // Nullable in model
});
export const editCategorySchema = insertCategorySchema.extend({});

// Product Form Validation (for the base 'Product' model)
export const insertProductSchema = z.object({
  name: z.string().min(2, "Product name must be at least 2 characters."),
  sku: z.string().min(1, "SKU is required if provided.").nullable(), // Nullable in model, but if present, min 1
  unit: z.string().min(1, "Unit is required."),
  description: z.string().nullable().optional(),
  category_id: z.coerce.number().int().positive("Category is required.").nullable(), // Nullable in model
  image_url: z.string().url().nullable().optional(), // Added here for consistency
});
export const editProductSchema = insertProductSchema.extend({});

// StoreProduct Form Validation (for adding/editing store-specific product details)
export const insertStoreProductSchema = z.object({
  store_id: z.coerce.number().int().positive("Store ID is required."),
  product_id: z.coerce.number().int().positive("Product ID is required."),
  quantity_in_stock: z.coerce.number().int().nonnegative("Stock quantity cannot be negative.").default(0),
  quantity_spoilt: z.coerce.number().int().nonnegative("Spoilt quantity cannot be negative.").default(0),
  low_stock_threshold: z.coerce.number().int().nonnegative("Low stock threshold cannot be negative.").default(10),
  price: z.coerce.number().nonnegative("Price cannot be negative."),
  // last_updated is handled by backend
});
export const editStoreProductSchema = insertStoreProductSchema.extend({}); // For updating an existing StoreProduct

// Supplier Form Validation
export const insertSupplierSchema = z.object({
  name: z.string().min(2, "Supplier name must be at least 2 characters."),
  contact_person: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().email("Invalid email address.").nullable().optional(),
  address: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});
export const editSupplierSchema = insertSupplierSchema.extend({});

// Purchase Form Validation
export const insertPurchaseSchema = z.object({
  supplier_id: z.coerce.number().int().positive("Supplier is required.").nullable(),
  store_id: z.coerce.number().int().positive("Store is required."),
  date: z.string().datetime().optional(), // ISO string from frontend, backend converts to Date
  reference_number: z.string().nullable().optional(),
  is_paid: z.boolean().default(false),
  notes: z.string().nullable().optional(),
  // If you want to create purchase with items in one go, add:
  // purchase_items: z.array(insertPurchaseItemSchema).min(1, "Purchase must have at least one item.").optional(),
});
export const editPurchaseSchema = insertPurchaseSchema.extend({});

// Purchase Item Form Validation
export const insertPurchaseItemSchema = z.object({
  purchase_id: z.coerce.number().int().positive("Purchase ID is required."), // Should be handled by backend usually
  product_id: z.coerce.number().int().positive("Product ID is required."),
  quantity: z.coerce.number().int().min(1, "Quantity must be at least 1."),
  unit_cost: z.coerce.number().nonnegative("Unit cost cannot be negative."),
});
export const editPurchaseItemSchema = insertPurchaseItemSchema.extend({});

// Supply Request Form Validation
export const insertSupplyRequestSchema = z.object({
  store_id: z.coerce.number().int().positive("Store ID is required."),
  product_id: z.coerce.number().int().positive("Product ID is required."),
  clerk_id: z.coerce.number().int().positive("Clerk ID is required."),
  requested_quantity: z.coerce.number().int().min(1, "Requested quantity must be at least 1."),
  status: supplyRequestStatusEnum.default('pending'), // This might be set by backend initially
  admin_id: z.coerce.number().int().positive().nullable(),
  admin_response: z.string().nullable().optional(),
});
export const editSupplyRequestSchema = insertSupplyRequestSchema.extend({
    // For admin approval/declining
    status: supplyRequestStatusEnum,
    admin_id: z.coerce.number().int().positive("Admin ID is required for status change.").nullable(),
    admin_response: z.string().nullable().optional(),
});


// Stock Transfer Form Validation
export const insertStockTransferSchema = z.object({
  from_store_id: z.coerce.number().int().positive("Origin store is required."),
  to_store_id: z.coerce.number().int().positive("Destination store is required."),
  initiated_by: z.coerce.number().int().positive("Initiator is required."),
  approved_by: z.coerce.number().int().positive().nullable(),
  status: stockTransferStatusEnum.default('pending'),
  transfer_date: z.string().datetime().optional(), // Optional: can be set by backend
  notes: z.string().nullable().optional(),
  // The items array might be sent as part of the main transfer payload
  items: z.array(
    z.object({
      product_id: z.coerce.number().int().positive(),
      quantity: z.coerce.number().int().min(1),
    })
  ).min(1, "At least one product must be included in the transfer"),
});
export const editStockTransferSchema = insertStockTransferSchema.extend({
    // For approval/rejection
    status: stockTransferStatusEnum,
    approved_by: z.coerce.number().int().positive("Approver ID is required for status change.").nullable(),
});

// Stock Transfer Item Schema (for fetched data)
export const stockTransferItemSchema = baseModelSchema.extend({
  stock_transfer_id: z.number().int().positive().nullable(),
  product_id: z.number().int().positive().nullable(),
  quantity: z.number().int().nonnegative(),
  product: productSchema.optional(), // If backend nests product details
});