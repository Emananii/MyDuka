// import React, { useEffect, useState } from "react";
// import {
//   Table,
//   TableHeader,
//   TableBody,
//   TableRow,
//   TableHead,
//   TableCell,
// } from "@/components/ui/table";
// import { Button } from "@/components/ui/button";
// import toast from "react-hot-toast";

// const SupplyRequests = () => {
//   const [requests, setRequests] = useState([]);
//   const BASE = import.meta.env.VITE_BACKEND_URL;

//   const fetchRequests = React.useCallback(async () => {
//     try {
//       const res = await fetch(`${BASE}/api/admin/supply-requests`);
//       const data = await res.json();
//       setRequests(data.requests || []);
//     } catch {
//       toast.error("Failed to load supply requests");
//     }
//   }, [BASE]);

//   useEffect(() => {
//     fetchRequests();
//   }, [fetchRequests]);

//   const doAction = async (id, action) => {
//     try {
//       await fetch(`${BASE}/api/admin/supply-requests/${id}/${action}`, {
//         method: "PATCH",
//       });
//       setRequests((prev) =>
//         prev.map((r) => (r.id === id ? { ...r, status: action } : r))
//       );
//       toast.success(`Request ${action}`);
//     } catch {
//       toast.error("Action failed");
//     }
//   };

//   return (
//     <div>
//       <h2 className="text-xl font-semibold mb-4">Supply Requests</h2>
//       <Table>
//         <TableHeader>
//           <TableRow>
//             <TableHead>Clerk</TableHead>
//             <TableHead>Product</TableHead>
//             <TableHead>Qty</TableHead>
//             <TableHead>Status</TableHead>
//             <TableHead>Actions</TableHead>
//           </TableRow>
//         </TableHeader>
//         <TableBody>
//           {requests.map((req) => (
//             <TableRow key={req.id}>
//               <TableCell>{req.clerk_name}</TableCell>
//               <TableCell>{req.product_name}</TableCell>
//               <TableCell>{req.quantity}</TableCell>
//               <TableCell>{req.status}</TableCell>
//               <TableCell className="flex gap-2">
//                 <Button
//                   onClick={() => doAction(req.id, "approve")}
//                   disabled={req.status !== "pending"}
//                 >
//                   Approve
//                 </Button>
//                 <Button
//                   variant="destructive"
//                   onClick={() => doAction(req.id, "decline")}
//                   disabled={req.status !== "pending"}
//                 >
//                   Decline
//                 </Button>
//               </TableCell>
//             </TableRow>
//           ))}
//         </TableBody>
//       </Table>
//     </div>
//   );
// };

// export default SupplyRequests;
