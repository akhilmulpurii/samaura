"use client";

import React from "react";
import { motion } from "framer-motion";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sun, Moon, Monitor } from "lucide-react";

interface ThemeToggleCardProps {
  className?: string;
  index?: number;
}

export const ThemeToggleCard: React.FC<ThemeToggleCardProps> = ({
  className,
  index = 0,
}) => {
  const { theme, setTheme } = useTheme();

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        duration: 0.3,
        delay: index * 0.1,
        ease: "easeOut",
      }}
    >
      <div
        className={cn(
          "transition duration-200 bg-card backdrop-blur-sm p-3 rounded-xl w-full",
          className
        )}
      >
        <div className="flex gap-3 items-center w-full">
          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <h3 className="font-medium text-sm leading-tight">
                  Theme Settings
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Choose your preferred theme
                </p>
              </div>
            </div>

            <div className="mt-3">
              <Tabs value={theme} onValueChange={handleThemeChange}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="light" className="text-xs">
                    <Sun className="h-3 w-3 mr-1" />
                    Light
                  </TabsTrigger>
                  <TabsTrigger value="dark" className="text-xs">
                    <Moon className="h-3 w-3 mr-1" />
                    Dark
                  </TabsTrigger>
                  <TabsTrigger value="system" className="text-xs">
                    <Monitor className="h-3 w-3 mr-1" />
                    System
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
