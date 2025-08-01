import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Edit, Trash2, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { BASE_URL } from "@/lib/constants";

import AddStoreModal from "@/components/stores/add-store-modal";
import EditStoreModal from "@/components/stores/edit-store-modal";
import DeleteStoreModal from "@/components/stores/delete-store-modal";
import ViewStoreModal from "@/components/stores/view-store-modal";

export default function Stores() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStore, setSelectedStore] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  const {
    data: stores = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["stores"],
    queryFn: async () => {
      return await apiRequest("GET", `${BASE_URL}/api/store/`);
    },
  });

  const filteredStores = stores.filter((store) =>
    store.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEdit = (store) => (e) => {
    e.stopPropagation();
    setSelectedStore(store);
    setIsEditModalOpen(true);
  };

  const handleDelete = (store) => (e) => {
    e.stopPropagation();
    setSelectedStore(store);
    setIsDeleteModalOpen(true);
  };

  const handleView = (store) => {
    setSelectedStore(store);
    setIsViewModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-800">Stores</h1>
        <AddStoreModal onComplete={refetch} />
      </div>

      <Input
        placeholder="Search stores..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="max-w-md"
      />

      {isLoading ? (
        <div className="text-gray-500 mt-4">Loading stores...</div>
      ) : isError ? (
        <div className="text-red-500 mt-4">
          Error loading stores: {error?.message || "Unknown error"}
        </div>
      ) : (
        <div className="p-4 bg-white rounded-lg shadow-md border border-gray-200">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead>Name</TableHead>
                {/* --- New TableHead for Address --- */}
                <TableHead>Address</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStores.length > 0 ? (
                filteredStores.map((store) => (
                  <TableRow
                    key={store.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleView(store)}
                  >
                    <TableCell>{store.name}</TableCell>
                    {/* --- New TableCell to display the address --- */}
                    <TableCell>{store.address}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="ghost" size="sm" onClick={handleEdit(store)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={handleDelete(store)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  {/* --- Updated colSpan from 2 to 3 --- */}
                  <TableCell colSpan={3} className="text-center py-6 text-gray-500">
                    No stores found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <EditStoreModal
        store={selectedStore}
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedStore(null);
          refetch();
        }}
      />
      <DeleteStoreModal
        store={selectedStore}
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedStore(null);
        }}
        onConfirm={() => {
          setIsDeleteModalOpen(false);
          setSelectedStore(null);
          refetch();
        }}
      />

      <ViewStoreModal
        store={selectedStore}
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedStore(null);
        }}
      />
    </div>
  );
}
