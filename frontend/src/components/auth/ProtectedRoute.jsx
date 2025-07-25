import React, { useContext } from "react";
import { Route, Redirect } from "wouter";
import { UserContext } from "@/context/UserContext";

function ProtectedRoute({ component: Component, allowedRoles, ...rest }) {
  const { user } = useContext(UserContext);

  if (!user) {
    return <Redirect to="/login" />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <Redirect to={`/dashboard/${user.role}`} />;
  }

  return <Route component={Component} {...rest} />;
}

export default ProtectedRoute;
