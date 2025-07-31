import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Trash2, Mail, Clock, User, Store } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// API functions
const fetchPendingInvitations = async () => {
  const token = localStorage.getItem("token");
  const response = await fetch("/api/invitations/pending", {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch pending invitations");
  }

  return response.json();
};

const cancelInvitation = async (token) => {
  const authToken = localStorage.getItem("token");
  const response = await fetch(`/api/invitations/cancel/${token}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${authToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("Failed to cancel invitation");
  }

  return response.json();
};

const PendingInvitationsTable = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch pending invitations
  const {
    data: invitations = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["pendingInvitations"],
    queryFn: fetchPendingInvitations,
  });

  // Cancel invitation mutation
  const cancelInvitationMutation = useMutation({
    mutationFn: cancelInvitation,
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Invitation cancelled successfully",
      });
      queryClient.invalidateQueries(["pendingInvitations"]);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to cancel invitation",
        variant: "destructive",
      });
    },
  });

  const handleCancelInvitation = (token) => {
    cancelInvitationMutation.mutate(token);
  };

  const getTimeRemaining = (expiresAt) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diffInHours = Math.ceil((expiry - now) / (1000 * 60 * 60));
    
    if (diffInHours <= 0) return "Expired";
    if (diffInHours === 1) return "1 hour left";
    return `${diffInHours} hours left`;
  };

  const isExpired = (expiresAt) => {
    return new Date(expiresAt) <= new Date();
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Pending Invitations
          </CardTitle>
          <CardDescription>
            Loading pending admin invitations...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Mail className="h-5 w-5" />
            Error Loading Invitations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{error.message}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Pending Invitations
        </CardTitle>
        <CardDescription>
          Admin invitations waiting for registration
        </CardDescription>
      </CardHeader>
      <CardContent>
        {invitations.length === 0 ? (
          <div className="text-center py-8">
            <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Pending Invitations</h3>
            <p className="text-muted-foreground">
              All admin invitations have been completed or expired.
            </p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Email
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center gap-2">
                      <Store className="h-4 w-4" />
                      Store
                    </div>
                  </TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Status
                    </div>
                  </TableHead>
                  <TableHead>Sent Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((invitation) => (
                  <TableRow key={invitation.id}>
                    <TableCell className="font-medium">
                      {invitation.email}
                    </TableCell>
                    <TableCell>
                      {invitation.store?.name || "N/A"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize">
                        {invitation.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={isExpired(invitation.expires_at) ? "destructive" : "default"}
                        className="flex items-center gap-1 w-fit"
                      >
                        <Clock className="h-3 w-3" />
                        {getTimeRemaining(invitation.expires_at)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(invitation.created_at), "MMM dd, yyyy")}
                    </TableCell>
                    <TableCell className="text-right">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            disabled={cancelInvitationMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Cancel Invitation</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to cancel the invitation sent to{" "}
                              <strong>{invitation.email}</strong>? This action cannot be undone
                              and they will no longer be able to register using this invitation.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleCancelInvitation(invitation.token)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Cancel Invitation
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PendingInvitationsTable;