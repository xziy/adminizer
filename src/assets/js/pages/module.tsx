import {usePage} from "@inertiajs/react";
import {type BreadcrumbItem, SharedData} from "@/types";
import React, {FC, useState, useEffect} from "react";
import AppLayout from "@/layouts/app-layout.tsx";
import {LoaderCircle} from "lucide-react";

export interface ComponentType {
  default: FC<{ message?: string }>;
}

const breadcrumbs: BreadcrumbItem[] = [];
export default function Module() {
  const page = usePage<SharedData>();
  const [Component, setComponent] = useState<React.ReactElement | null>(null);

  useEffect(() => {
    const initModule = async () => {
      // Загружаем JS-компонент
      const Module = await import(/* @vite-ignore */ page.props.moduleComponent as string);
      const Component = Module.default as ComponentType["default"];
      setComponent(<Component message={page.props.message as string} />);
    };

    // Загружаем CSS, если путь передан
    const loadCSS = () => {
      const cssPath = page.props.moduleComponentCSS as string | undefined;
      if (!cssPath) return;

      // Проверим, не был ли он уже добавлен
      if ([...document.head.querySelectorAll("link[rel='stylesheet']")].some(link => (link as HTMLLinkElement).href.includes(cssPath))) {
        return;
      }

      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = cssPath;
      link.type = "text/css";
      link.onload = () => console.log(`CSS loaded: ${cssPath}`);
      link.onerror = () => console.error(`Failed to load CSS: ${cssPath}`);
      document.head.appendChild(link);
    };

    loadCSS();
    initModule();
  }, []);

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
        {Component || (
          <LoaderCircle className="size-10 animate-spin text-neutral-500 mx-auto mt-[15%]" />
        )}
    </AppLayout>
  );
}
