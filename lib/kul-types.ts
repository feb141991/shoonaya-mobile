export type KulRole = "guardian" | "sadhak";
export type KulTaskType = "read" | "recite" | "practice" | "memorise";
export type KulEventType =
  | "birthday"
  | "anniversary"
  | "death_anniversary"
  | "puja"
  | "satsang"
  | "custom";
export type KulDateSystem = "gregorian" | "tithi";
export type KulPaksha = "shukla" | "krishna";
export type KulMonthSystem = "amanta" | "purnimanta";
export type KulTithi = {
  masa: number;
  paksha: KulPaksha;
  tithi: number;
  monthSystem: KulMonthSystem;
  masaIsAdhika: boolean;
};
