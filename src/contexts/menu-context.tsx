import { useQuery } from "@tanstack/react-query";
import {
  createContext,
  useContext,
  useMemo,
  type PropsWithChildren,
} from "react";
import { buildMenuCatalog, defaultMenuCatalog, type MenuCatalog } from "@/data/menu";
import { fetchPublicMenu } from "@/lib/menu-api";

const MenuContext = createContext<MenuCatalog>(defaultMenuCatalog);

export function MenuProvider({ children }: PropsWithChildren) {
  const menuQuery = useQuery({
    queryKey: ["public-menu"],
    queryFn: fetchPublicMenu,
    retry: false,
    staleTime: 60_000,
  });

  const menu = useMemo(
    () => (menuQuery.data ? buildMenuCatalog(menuQuery.data) : defaultMenuCatalog),
    [menuQuery.data],
  );

  return <MenuContext.Provider value={menu}>{children}</MenuContext.Provider>;
}

export function useMenuCatalog() {
  return useContext(MenuContext);
}
