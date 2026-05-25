import AppProviders from "./app/AppProviders.jsx";
import MainLayout from "./app/layout/MainLayout.jsx";

export default function App() {
  return (
    <AppProviders>
      <MainLayout />
    </AppProviders>
  );
}
