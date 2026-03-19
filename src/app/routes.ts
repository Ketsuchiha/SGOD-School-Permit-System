import { createBrowserRouter } from "react-router-dom";
import { DashboardLayout } from "./components/DashboardLayout";
import { DashboardView } from "./components/DashboardView";
import { MapView } from "./components/MapView";
import { SchoolDirectory } from "./components/SchoolDirectory";
import { TrashBin } from "./components/TrashBin";
import { SettingsView } from "./components/SettingsView";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: DashboardLayout,
    children: [
      { index: true, Component: DashboardView },
      { path: "map", Component: MapView },
      { path: "directory", Component: SchoolDirectory },
      { path: "trash", Component: TrashBin },
      { path: "settings", Component: SettingsView },
    ],
  },
]);
