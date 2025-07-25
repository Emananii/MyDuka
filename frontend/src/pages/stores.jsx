// frontend/src/pages/stores.jsx
import React from "react";
import { useQuery } from "@tanstack/react-query";
import AddStoreModal from "@/components/stores/add-store-modal";
import EditStoreModal from "@/components/stores/edit-store-modal";
import DeleteStoreModal from "@/components/stores/delete-store-modal";
import { apiRequest } from "@/lib/queryClient"; // ✅ IMPORTED apiRequest
import { BASE_URL } from "@/lib/constants"; // ✅ Ensure BASE_URL is consistent

const Stores = () => {
  const {
    data: stores = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: [`${BASE_URL}/api/store/`], // ✅ Match key with the query URL
    queryFn: async () => {
      return await apiRequest("GET", `${BASE_URL}/api/store/`); // ✅ Uses JWT from localStorage
    },
  });

  if (isLoading) return <div>Loading...</div>;
  if (isError) return <div>Error: {error.message}</div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Stores</h1>
        <AddStoreModal />
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200">
          <thead className="bg-gray-100">
            <tr>
              <th className="py-2 px-4 border-b">Name</th>
              <th className="py-2 px-4 border-b">Location</th>
              <th className="py-2 px-4 border-b">Actions</th>
            </tr>
          </thead>
          <tbody>
            {stores.map((store) => (
              <tr key={store.id} className="hover:bg-gray-50">
                <td className="py-2 px-4 border-b">{store.name}</td>
                <td className="py-2 px-4 border-b">{store.location}</td>
                <td className="py-2 px-4 border-b space-x-2">
                  <EditStoreModal store={store} />
                  <DeleteStoreModal storeId={store.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Stores;
