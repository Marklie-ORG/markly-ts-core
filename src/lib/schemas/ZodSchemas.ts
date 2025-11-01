import { z } from "zod";


export const UuidSchema = z.uuid();

export const DayOfWeekSchema = z.enum([
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
]);

export const FrequencySchema = z.enum([
  "weekly",
  "biweekly",
  "monthly",
  "custom",
  "cron",
]);

export const TimeSchema = z
  .string()
  .regex(/^\d{2}:\d{2}$/, "time must be in HH:mm format");

export const DatePresetSchema = z.string();