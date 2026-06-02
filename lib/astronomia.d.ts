declare module 'astronomia/julian' {
  const julian: {
    DateToJDE(date: Date): number;
    CalendarGregorian: new (year: number, month: number, day: number) => unknown;
  };
  export default julian;
}

declare module 'astronomia/solar' {
  const solar: {
    apparentLongitude(t: number): number;
  };
  export default solar;
}

declare module 'astronomia/moonposition' {
  const moonposition: {
    position(jde: number): { lon: number };
  };
  export default moonposition;
}

declare module 'astronomia/nutation' {
  const nutation: {
    nutation(jde: number): [number, number];
  };
  export default nutation;
}

declare module 'astronomia/sunrise' {
  type AstroDateLike = {
    toDate(): Date;
  };

  export class Sunrise {
    constructor(calendar: unknown, lat: number, lon: number, altitude?: number);
    rise(): AstroDateLike | null;
    set(): AstroDateLike | null;
    noon(): AstroDateLike;
  }
}
