import React from "react";
import TopNav from "../Navigation/TopNav";

type NavbarProps = {
  transparent?: boolean;
};

const AuthNavbar: React.FC<NavbarProps> = () => {
  return <TopNav />;
};

export default AuthNavbar;

