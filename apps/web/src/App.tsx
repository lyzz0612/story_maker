import { Navigate, Route, Routes } from "react-router-dom";

import { AppLayout } from "@/components/AppLayout";
import { CharactersPage } from "@/pages/CharactersPage";
import { NewProjectPage } from "@/pages/NewProjectPage";
import { ProjectWorkspace } from "@/pages/ProjectWorkspace";
import { ProjectsPage } from "@/pages/ProjectsPage";
import { SettingsPage } from "@/pages/SettingsPage";

export function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<ProjectsPage />} />
        <Route path="characters" element={<CharactersPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="projects/new" element={<NewProjectPage />} />
        <Route path="projects/:id" element={<ProjectWorkspace />} />
        <Route path="*" element={<Navigate replace to="/" />} />
      </Route>
    </Routes>
  );
}
