import {Redis} from "ioredis";

export const publisher = new Redis({
  host: "localhost",
  port: 6379,
});

export const subscriber = new Redis({
  host: "localhost",
  port: 6379,
});

publisher.on("connect", () => {
  console.log("Redis publisher connected");
});

subscriber.on("connect", () => {
  console.log("Redis subscriber connected");
});

publisher.on("error", (error) => {
  console.log("Redis publisher error:", error);
});

subscriber.on("error", (error) => {
  console.log("Redis subscriber error:", error);
});