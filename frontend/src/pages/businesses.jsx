import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Plus, Edit, MapPin } from "lucide-react";
import AddBusinessModal from "@/components/businesses/add-business-modal";
import EditBusinessModal from "@/components/businesses/edit-business-modal";
import ViewBusinessModal from "@/components/businesses/view-business-modal";
import { useToast } from "@/hooks/use-toast";
import { BASE_URL } from "@/lib/constants";

export default function Businesses() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingBusiness, setEditingBusiness] = useState(null);
  const [viewingBusiness, setViewingBusiness] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  const {
    data: businesses = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["business_locations"],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}/business_locations`);
      if (!res.ok) throw new Error("Failed to fetch business locations");
      return res.json();
    },
  });

  const filteredBusinesses = businesses.filter((business) =>
    business.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (business.address && business.address.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card className="animate-pulse">
          <CardContent className="p-6">
            <div className="h-20 bg-gray-200 rounded" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6 text-red-500">
            Error loading business locations: {error.message}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-800">Business Locations</h1>
        <Button onClick={() => setIsAddModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Business
        </Button>
      </div>

      {/* Search */}
      <Card className="bg-white rounded-xl shadow-sm border border-gray-200">
        <CardContent className="p-6">
          <div className="flex items-center space-x-4">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Search businesses..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Businesses Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredBusinesses.length > 0 ? (
          filteredBusinesses.map((business) => (
            <Card
              key={business.id}
              onClick={() => setViewingBusiness(business)}
              className={`bg-white rounded-xl shadow-sm border ${
                business.is_active
                  ? "border-gray-200 hover:shadow-md"
                  : "border-red-200 bg-red-50 text-gray-400"
              } transition-shadow cursor-pointer`}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center mr-3 ${
                        business.is_active ? "bg-blue-100" : "bg-red-100"
                      }`}
                    >
                      <MapPin className={`h-5 w-5 ${business.is_active ? "text-blue-600" : "text-red-600"}`} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{business.name}</h3>
                      <p className="text-sm text-gray-500">Business #{business.id}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingBusiness(business);
                    }}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-2">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Address</p>
                    <p className="text-sm text-gray-600">
                      {business.address || "No address provided"}
                    </p>
                  </div>
                  <div>
                    <span
                      className={`inline-block text-xs font-medium rounded px-2 py-1 ${
                        business.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                      }`}
                    >
                      {business.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="col-span-full">
            <Card className="bg-white rounded-xl shadow-sm border border-gray-200">
              <CardContent className="p-12 text-center">
                <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No businesses found
                </h3>
                <p className="text-gray-500 mb-6">
                  Get started by adding your first business location.
                </p>
                <Button onClick={() => setIsAddModalOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Business
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Businesses Table */}
      <Card className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">All Businesses</h3>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead>Business ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Address</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBusinesses.length > 0 ? (
                filteredBusinesses.map((business) => (
                  <TableRow
                    key={business.id}
                    onClick={() => setViewingBusiness(business)}
                    className={`hover:bg-gray-50 cursor-pointer ${
                      !business.is_active ? "opacity-60 bg-red-50" : ""
                    }`}
                  >
                    <TableCell className="font-medium">#{business.id}</TableCell>
                    <TableCell>
                      {business.name}
                      {!business.is_active && (
                        <span className="ml-2 text-xs text-red-600">(Inactive)</span>
                      )}
                    </TableCell>
                    <TableCell>{business.address || "N/A"}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingBusiness(business);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan="4" className="text-center py-8 text-gray-500">
                    No businesses found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Modals */}
      <AddBusinessModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />
      {editingBusiness && (
        <EditBusinessModal
          business={editingBusiness}
          isOpen={true}
          onClose={() => setEditingBusiness(null)}
        />
      )}
      {viewingBusiness && (
        <ViewBusinessModal
          business={viewingBusiness}
          isOpen={true}
          onClose={() => setViewingBusiness(null)}
        />
      )}
    </div>
  );
}