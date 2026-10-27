import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createBrowserRouter,
  createRoutesFromElements,
  Route,
  RouterProvider,
  Outlet,
  ScrollRestoration,
} from "react-router-dom";
import { ThemeProvider } from "next-themes";
import NotFound from "@/pages/NotFound";
import ScrollToHashElement from "@/components/ScrollToHashElement";

const queryClient = new QueryClient();

function RootLayout() {
  return (
      <>
        <Outlet />
        <ScrollRestoration />
        {/* Handles in-page hash anchors uniformly: <a href="#x">,
            <Link to="#x"> and navigate("#x") all scroll smoothly. */}
        <ScrollToHashElement />
      </>
  );
}

const router = createBrowserRouter(
    createRoutesFromElements(
        <Route element={<RootLayout />}>
          {/* Add route variables here for multi-side, or routes directly for single-side */}
          <Route path="*" element={<NotFound />} />
        </Route>
    )
);

const App = () => (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Sonner />
          <RouterProvider router={router} />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
);

export default App;
