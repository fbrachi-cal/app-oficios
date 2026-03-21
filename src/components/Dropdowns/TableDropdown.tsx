import React, { useRef, useState } from "react";
import { createPopper } from "@popperjs/core";
import { useTranslation } from "react-i18next";

const TableDropdown: React.FC = () => {
  const { t } = useTranslation();
  const [dropdownPopoverShow, setDropdownPopoverShow] = useState(false);

  const btnDropdownRef = useRef<HTMLAnchorElement>(null);
  const popoverDropdownRef = useRef<HTMLDivElement>(null);

  const openDropdownPopover = () => {
    if (btnDropdownRef.current && popoverDropdownRef.current) {
      createPopper(btnDropdownRef.current, popoverDropdownRef.current, {
        placement: "left-start",
      });
      setDropdownPopoverShow(true);
    }
  };

  const closeDropdownPopover = () => setDropdownPopoverShow(false);

  return (
    <>
      <a
        className="text-blueGray-500 py-1 px-3"
        href="#pablo"
        ref={btnDropdownRef}
        onClick={(e) => {
          e.preventDefault();
          dropdownPopoverShow ? closeDropdownPopover() : openDropdownPopover();
        }}
      >
        <i className="fas fa-ellipsis-v"></i>
      </a>
      <div
        ref={popoverDropdownRef}
        className={
          (dropdownPopoverShow ? "block " : "hidden ") +
          "bg-white text-base z-50 float-left py-2 list-none text-left rounded shadow-lg min-w-48"
        }
      >
        {[t("accion"), t("otra_accion"), t("algo_mas_aqui")].map((item, idx) => (
          <a
            key={idx}
            href="#pablo"
            className="text-sm py-2 px-4 font-normal block w-full whitespace-nowrap bg-transparent text-blueGray-700"
            onClick={(e) => e.preventDefault()}
          >
            {item}
          </a>
        ))}
      </div>
    </>
  );
};

export default TableDropdown;
