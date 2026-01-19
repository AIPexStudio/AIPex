import { z } from "zod";
export declare const computerTool: import("@openai/agents").FunctionTool<unknown, z.ZodObject<{
    action: z.ZodEnum<{
        hover: "hover";
        type: "type";
        key: "key";
        scroll: "scroll";
        wait: "wait";
        left_click: "left_click";
        right_click: "right_click";
        left_click_drag: "left_click_drag";
        double_click: "double_click";
        triple_click: "triple_click";
        scroll_to: "scroll_to";
    }>;
    coordinate: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodNumber>>>;
    text: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    start_coordinate: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodNumber>>>;
    scroll_direction: z.ZodOptional<z.ZodNullable<z.ZodEnum<{
        left: "left";
        right: "right";
        up: "up";
        down: "down";
    }>>>;
    scroll_amount: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    duration: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    tabId: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    uid: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.core.$strip>, string>;
