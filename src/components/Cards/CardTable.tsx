import React from "react";
import TableDropdown from "../Dropdowns/TableDropdown";

// Tipado para props
type CardTableProps = {
  color?: "light" | "dark";
};

const CardTable: React.FC<CardTableProps> = ({ color = "light" }) => {
  return (
    <div
      className={`relative flex flex-col min-w-0 break-words w-full mb-6 shadow-lg rounded ${
        color === "light" ? "bg-white" : "bg-lightBlue-900 text-white"
      }`}
    >
      <div className="rounded-t mb-0 px-4 py-3 border-0">
        <div className="flex flex-wrap items-center">
          <div className="relative w-full px-4 max-w-full flex-grow flex-1">
            <h3
              className={`font-semibold text-lg ${
                color === "light" ? "text-blueGray-700" : "text-white"
              }`}
            >
              Card Tables
            </h3>
          </div>
        </div>
      </div>

      <div className="block w-full overflow-x-auto">
        <table className="items-center w-full bg-transparent border-collapse">
          <thead>
            <tr>
              {["Project", "Budget", "Status", "Users", "Completion", ""].map((title) => (
                <th
                  key={title}
                  className={`px-6 align-middle border border-solid py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left ${
                    color === "light"
                      ? "bg-blueGray-50 text-blueGray-500 border-blueGray-100"
                      : "bg-lightBlue-800 text-lightBlue-300 border-lightBlue-700"
                  }`}
                >
                  {title}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {[
              {
                name: "Argon Design System",
                logo: "/assets/img/bootstrap.jpg",
                budget: "$2,500 USD",
                status: { label: "pending", color: "text-orange-500" },
                completion: 60,
              },
              {
                name: "Angular Now UI Kit PRO",
                logo: "/assets/img/angular.jpg",
                budget: "$1,800 USD",
                status: { label: "completed", color: "text-emerald-500" },
                completion: 100,
              },
              {
                name: "Black Dashboard Sketch",
                logo: "/assets/img/sketch.jpg",
                budget: "$3,150 USD",
                status: { label: "delayed", color: "text-red-500" },
                completion: 73,
              },
              {
                name: "React Material Dashboard",
                logo: "/assets/img/react.jpg",
                budget: "$4,400 USD",
                status: { label: "on schedule", color: "text-teal-500" },
                completion: 90,
              },
              {
                name: "Vue Material Dashboard",
                logo: "/assets/img/vue.jpg",
                budget: "$2,200 USD",
                status: { label: "completed", color: "text-emerald-500" },
                completion: 100,
              },
            ].map((project, idx) => (
              <tr key={idx}>
                <th className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4 text-left flex items-center">
                  <img
                    src={project.logo}
                    className="h-12 w-12 bg-white rounded-full border"
                    alt={project.name}
                  />
                  <span
                    className={`ml-3 font-bold ${
                      color === "light" ? "text-blueGray-600" : "text-white"
                    }`}
                  >
                    {project.name}
                  </span>
                </th>

                <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4">
                  {project.budget}
                </td>

                <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4">
                  <i className={`fas fa-circle ${project.status.color} mr-2`}></i>{" "}
                  {project.status.label}
                </td>

                <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4">
                  <div className="flex">
                    {[1, 2, 3, 4].map((i) => (
                      <img
                        key={i}
                        src={`/assets/img/team-${i}-800x800.jpg`}
                        alt={`Team ${i}`}
                        className={`w-10 h-10 rounded-full border-2 border-blueGray-50 shadow ${
                          i > 1 ? "-ml-4" : ""
                        }`}
                      />
                    ))}
                  </div>
                </td>

                <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4">
                  <div className="flex items-center">
                    <span className="mr-2">{project.completion}%</span>
                    <div className="relative w-full">
                      <div className="overflow-hidden h-2 text-xs flex rounded bg-red-200">
                        <div
                          style={{ width: `${project.completion}%` }}
                          className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-red-500"
                        ></div>
                      </div>
                    </div>
                  </div>
                </td>

                <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4 text-right">
                  <TableDropdown />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CardTable;
