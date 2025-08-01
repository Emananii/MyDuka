import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useSearchParams, useNavigate } from "react-router-dom";
import { z } from "zod";
import { Eye, EyeOff, CheckCircle, XCircle, Mail, Store, User, Lock } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

// Validation schema
const registrationSchema = z
  .object({
    name: z
      .string()
      .min(2, "Name must be at least 2 characters")
      .max(50, "Name must be less than 50 characters"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one number"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

// API functions
const validateInvitationToken = async (token) => {
  const response = await fetch(`/api/invitations/validate/${token}`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Invalid invitation token");
  }
  
  return response.json();
};

const completeRegistration = async (data) => {
  const response = await fetch("/api/invitations/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Registration failed");
  }

  return response.json();
};

const AdminRegistrationPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm({
    resolver: zodResolver(registrationSchema),
  });

  // Validate invitation token
  const {
    data: invitation,
    isLoading: isValidating,
    error: validationError,
  } = useQuery({
    queryKey: ["validateInvitation", token],
    queryFn: () => validateInvitationToken(token),
    enabled: !!token,
    retry: false,
  });

  // Complete registration mutation
  const registrationMutation = useMutation({
    mutationFn: completeRegistration,
    onSuccess: () => {
      // Redirect to login page with success message
      navigate("/login?registered=true");
    },
  });

  // Redirect if no token
  useEffect(() => {
    if (!token) {
      navigate("/login");
    }
  }, [token, navigate]);

  const onSubmit = (data) => {
    registrationMutation.mutate({
      token,
      name: data.name,
      password: data.password,
      confirm_password: data.confirmPassword,
    });
  };

  const getPasswordStrength = (password) => {
    let strength = 0;
    let feedback = [];

    if (password.length >= 8) strength++;
    else feedback.push("At least 8 characters");

    if (/[A-Z]/.test(password)) strength++;
    else feedback.push("One uppercase letter");

    if (/[a-z]/.test(password)) strength++;
    else feedback.push("One lowercase letter");

    if (/[0-9]/.test(password)) strength++;
    else feedback.push("One number");

    const levels = ["Very Weak", "Weak", "Fair", "Strong"];
    const colors = ["bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-green-500"];

    return {
      level: levels[strength] || "Very Weak",
      color: colors[strength] || "bg-red-500",
      percentage: (strength / 4) * 100,
      feedback,
    };
  };

  const password = watch("password", "");
  const passwordStrength = getPasswordStrength(password);

  // Loading state
  if (isValidating) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="text-muted-foreground">Validating invitation...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (validationError || !invitation) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
              <XCircle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle className="text-destructive">Invalid Invitation</CardTitle>
            <CardDescription>
              {validationError?.message || "This invitation link is invalid or has expired."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => navigate("/login")} 
              className="w-full"
            >
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Complete Your Registration</CardTitle>
          <CardDescription>
            You've been invited to join as an admin. Complete your registration below.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Invitation Details */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
              Invitation Details
            </h3>
            <div className="grid grid-cols-1 gap-3">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{invitation.email}</span>
              </div>
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <Badge variant="secondary" className="capitalize">
                  {invitation.role}
                </Badge>
              </div>
              {invitation.store && (
                <div className="flex items-center gap-3">
                  <Store className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{invitation.store.name}</span>
                </div>
              )}
            </div>
          </div>

          {/* Registration Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Name Field */}
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                {...register("name")}
                placeholder="Enter your full name"
                className={errors.name ? "border-destructive" : ""}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  {...register("password")}
                  placeholder="Create a strong password"
                  className={errors.password ? "border-destructive pr-10" : "pr-10"}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword((prev) => !prev)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              
              {/* Password Strength Indicator */}
              {password && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Password Strength:</span>
                    <span className={`font-medium ${
                      passwordStrength.level === "Strong" ? "text-green-600" :
                      passwordStrength.level === "Fair" ? "text-yellow-600" :
                      "text-red-600"
                    }`}>
                      {passwordStrength.level}
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${passwordStrength.color}`}
                      style={{ width: `${passwordStrength.percentage}%` }}
                    ></div>
                  </div>
                  {passwordStrength.feedback.length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      Missing: {passwordStrength.feedback.join(", ")}
                    </div>
                  )}
                </div>
              )}
              
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>

            {/* Confirm Password Field */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  {...register("confirmPassword")}
                  placeholder="Confirm your password"
                  className={errors.confirmPassword ? "border-destructive pr-10" : "pr-10"}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {errors.confirmPassword && (
                <p className="text-sm text-destructive">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            {/* Error Display */}
            {registrationMutation.error && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>
                  {registrationMutation.error.message}
                </AlertDescription>
              </Alert>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full"
              disabled={registrationMutation.isPending}
            >
              {registrationMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2"></div>
                  Creating Account...
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4 mr-2" />
                  Complete Registration
                </>
              )}
            </Button>
          </form>

          {/* Security Notice */}
          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              By registering, you agree to our terms of service and privacy policy.
              This invitation will expire in 24 hours.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminRegistrationPage;