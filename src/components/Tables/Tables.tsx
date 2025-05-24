import React from "react";
import CardTable from "../../components/Cards/CardTable"; // corregí el path si es necesario

const Tables: React.FC = () => {
  return (
    <>
      <div className="flex flex-wrap mt-4">
        <div className="w-full mb-12 px-4">
          <CardTable />
        </div>
        <div className="w-full mb-12 px-4">
          <CardTable color="dark" />
        </div>
      </div>
    </>
  );
};

export default Tables;
