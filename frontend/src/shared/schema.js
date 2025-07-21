import { z } from "zod";

// Business form validation
export const insertBusinessSchema = z.object({
  name: z.string().min(2, "Business name must be at least 2 characters."),
  address: z.string().min(5, "Address must be at least 5 characters."),
  contact_person: z.string().optional(),
  phone: z.string().optional(),
  notes: z.string().optional(),
  is_active: z.boolean().default(true),
});

// Category form validation
export const insertCategorySchema = z.object({
  name: z.string().min(2, "Category name must be at least 2 characters."),
  description: z.string().optional(),
});

// Edit Category Schema
export const editCategorySchema = insertCategorySchema.extend({
  // You can add more fields here if needed for edit, like description, etc.
});

// Supplier form validation
export const insertSupplierSchema = z.object({
  name: z.string().min(2),
  contact: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
  email: z.string().email("Invalid email").optional(),
  phone: z.string().min(5).optional(),
});

// Product form validation
export const insertInventoryItemSchema = z.object({
  name: z.string().min(2),
  sku: z.string().min(1),
  unit: z.string().optional(),
  description: z.string().optional(),
  category_id: z.coerce.number().min(1),
  stock_level: z.coerce.number().nonnegative().default(0),
});

// Purchase form validation
export const insertPurchaseSchema = z.object({
  supplier_id: z.coerce.number().min(1),
  total_cost: z.coerce.number().nonnegative(),
  notes: z.string().optional(),
  purchase_date: z.string().optional(), // ISO string
});

// Purchase Item form validation
export const insertPurchaseItemSchema = z.object({
  purchase_id: z.coerce.number().min(1),
  product_id: z.coerce.number().min(1),
  quantity: z.coerce.number().int().nonnegative(),
  unit_cost: z.coerce.number().nonnegative(),
});

// Stock transfer form validation
export const insertStockTransferSchema = z.object({
  transfer_type: z.enum(["IN", "OUT"], {
    required_error: "Transfer type is required",
    invalid_type_error: "Transfer type must be 'IN' or 'OUT'",
  }),
  location_id: z.coerce.number().optional(),
  date: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(
    z.object({
      product_id: z.coerce.number().min(1),
      quantity: z.coerce.number().int().nonnegative(),
    })
  ).min(1, "At least one product must be included in the transfer"),
});

// Business Location form validation
export const insertBusinessLocationSchema = z.object({
  name: z.string().min(2),
  address: z.string().optional(),
  contact_person: z.string().optional(),
  phone: z.string().optional(),
  notes: z.string().optional(),
  is_active: z.boolean().default(true),
});
