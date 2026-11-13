export interface BalanceInsight {
  isPositive: boolean;
  lead: string;
  emphasisLabel: string;
  tail: string;
}

export function getBalanceInsight(balance: number, monthLabel: string): BalanceInsight {
  if (balance >= 0) {
    return {
      isPositive: true,
      lead: `Keuangan keluarga Anda dalam kondisi baik pada ${monthLabel}.`,
      emphasisLabel: "Sisa",
      tail: "tersedia untuk pengeluaran.",
    };
  }
  return {
    isPositive: false,
    lead: `Pengeluaran pada ${monthLabel} melebihi pemasukan.`,
    emphasisLabel: "Defisit",
    tail: "Pertimbangkan untuk mengurangi pengeluaran non-esensial.",
  };
}
