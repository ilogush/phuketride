import { useEffect } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router";

interface UseAppLayoutWelcomeToastOptions {
  user: {
    id: string | number;
    name?: string | null;
    email: string;
  };
  success: (message: string) => void;
}

export function useAppLayoutWelcomeToast({ user, success }: UseAppLayoutWelcomeToastOptions) {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get("login") !== "success") {
      return;
    }

    const welcomeKey = `welcome-shown:${user.id}`;
    if (sessionStorage.getItem(welcomeKey) === "1") {
      return;
    }

    sessionStorage.setItem(welcomeKey, "1");
    success(`Welcome back, ${user.name || user.email}!`);

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("login");
    navigate(
      `${location.pathname}${nextParams.toString() ? `?${nextParams.toString()}` : ""}`,
      { replace: true },
    );
  }, [location.pathname, navigate, searchParams, success, user.email, user.id, user.name]);
}
