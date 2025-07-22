import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function ViewStoreModal({ store, isOpen, onClose }) {
  const fields = [
    { label: "Name", value: store?.name },
    { label: "Address", value: store?.address },
    { label: "Contact Person", value: store?.contact_person },
    { label: "Phone", value: store?.phone },
    { label: "Notes", value: store?.notes },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-gray-800">
            View Store Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {fields.map((field) => (
            <div key={field.label}>
              <label className="block text-sm font-medium text-gray-700">
                {field.label}
              </label>
              <Input value={field.value || ""} readOnly className="mt-1" />
            </div>
          ))}

          <Button onClick={onClose} variant="outline" className="w-full mt-4">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
