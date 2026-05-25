import AppProviders from "./app/AppProviders";
import MainLayout from "./app/layout/MainLayout";

export default function App() {
  return (
    <AppProviders>
      <MainLayout />
    </AppProviders>
  );
}
