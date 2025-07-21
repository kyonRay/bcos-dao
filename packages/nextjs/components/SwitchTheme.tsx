"use client";

import { useEffect, useState } from "react";
import { MoonOutlined, SunOutlined } from "@ant-design/icons";
import { Button } from "antd";
import { useTheme } from "next-themes";

export const SwitchTheme = ({ className }: { className?: string }) => {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  const isDarkMode = resolvedTheme === "dark";

  const handleToggle = () => {
    if (isDarkMode) {
      setTheme("light");
      return;
    }
    setTheme("dark");
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className={`flex space-x-2 h-8 items-center justify-center text-sm ${className}`}>
      {/*<input*/}
      {/*  id="theme-toggle"*/}
      {/*  type="checkbox"*/}
      {/*  className="toggle toggle-primary bg-primary hover:bg-primary border-primary"*/}
      {/*  onChange={handleToggle}*/}
      {/*  checked={isDarkMode}*/}
      {/*/>*/}
      <Button
        type="text"
        className="flex items-center justify-center w-9 h-9 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
        onClick={handleToggle}
        size="large"
        icon={
          theme === "dark" ? (
            <SunOutlined className="text-gray-500 dark:text-gray-400" />
          ) : (
            <MoonOutlined className="text-gray-500 dark:text-gray-400" />
          )
        }
      />
    </div>
  );
};
