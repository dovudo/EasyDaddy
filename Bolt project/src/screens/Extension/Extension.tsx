import React, { useState } from "react";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Checkbox } from "../../components/ui/checkbox";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { ScrollArea, ScrollBar } from "../../components/ui/scroll-area";

export const Extension = (): JSX.Element => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="bg-[#f9f9f9] flex flex-row justify-center w-full">
      <Card className="bg-[#f9f9f9] border border-solid border-[#d9cfcf] w-[500px] h-[1189px] relative">
        <CardContent className="p-0">
          <img
            className="absolute w-[57px] h-11 top-8 left-[222px]"
            alt="Logo"
            src="/logo.png"
          />

          <h1 className="absolute w-[428px] top-[110px] left-9 font-extension-h2 font-bold text-[#1a232b] text-[28px] text-center tracking-[-0.84px] leading-[36.4px]">
            Write about you and your experience
          </h1>

          <ScrollArea className="h-[317px] w-full absolute top-[218px] left-9 pr-9">
            <div className="flex flex-col w-full items-start gap-6">
              <div className="flex flex-col items-start gap-2 relative self-stretch w-full flex-[0_0_auto]">
                <Label
                  htmlFor="name"
                  className="font-normal text-[#000000] text-base tracking-[0] leading-normal whitespace-nowrap"
                >
                  Your Name
                </Label>

                <Input
                  id="name"
                  className="flex items-center gap-2.5 px-3 py-3.5 bg-[#fcfcfc] rounded-sm border border-solid border-[#ded8d0]"
                  defaultValue="Maxim Zvarici"
                  readOnly
                />
              </div>

              <div className="flex flex-col items-start gap-2 relative self-stretch w-full flex-[0_0_auto]">
                <div className="flex flex-col items-start gap-2 relative self-stretch w-full flex-[0_0_auto]">
                  <Label
                    htmlFor="education"
                    className="font-normal text-[#000000] text-base tracking-[0] leading-normal whitespace-nowrap"
                  >
                    Education
                  </Label>

                  <Input
                    id="education"
                    type={showPassword ? "text" : "password"}
                    className="flex items-center gap-2.5 px-3 py-3.5 bg-[#fcfcfc] rounded-sm border border-solid border-[#ded8d0]"
                    defaultValue="************"
                  />
                </div>

                <div className="flex items-center gap-2 px-1 py-0 relative self-stretch w-full flex-[0_0_auto]">
                  <Checkbox
                    id="show-password"
                    className="w-[18px] h-[18px] rounded-[3px] border border-solid border-[#cecece]"
                    onCheckedChange={(checked) =>
                      setShowPassword(checked as boolean)
                    }
                  />
                  <Label
                    htmlFor="show-password"
                    className="font-normal text-[#000000] text-sm tracking-[0] leading-normal cursor-pointer"
                  >
                    Show password
                  </Label>
                </div>
              </div>
            </div>
            <ScrollBar
              orientation="vertical"
              className="w-2 bg-[#d5d5d5] rounded-[100px]"
            >
              <div className="h-[33px] bg-[#7a7a7a] rounded-[100px]" />
            </ScrollBar>
          </ScrollArea>

          <Button className="flex w-[428px] items-center justify-center gap-2.5 px-9 py-3.5 absolute bottom-[45px] left-9 bg-[#ffbd6f] hover:bg-[#ffbd6f]/90 rounded-sm text-[#1a222a] font-medium">
            Save and continue
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
