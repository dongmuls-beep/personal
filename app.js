const loans = {
  shinhee: { name: '신희타 모기지', amount: 232_119_000, rate: 1.6, monthlyInterest: 309_492, type: 'mortgage' },
  busan: { name: '부산은행 대출', amount: 43_000_000, rate: 4.5, monthlyInterest: 161_250, type: 'credit' },
  samsung: { name: '삼성생명 대출', amount: 11_170_000, rate: 4.12, monthlyInterest: 38_350, type: 'insurance' },
  pension: { name: '연금저축 담보대출', amount: 9_500_000, rate: 3.0, monthlyInterest: 23_750, type: 'pension' }
};

const loanValues = Object.values(loans);
const totalDebt = loanValues.reduce((acc, loan) => acc + loan.amount, 0);
const pensionMaturityMonths = 24;
const pensionPrincipalMonthly = Math.ceil(loans.pension.amount / pensionMaturityMonths);
const shinheeGraceMonths = 12;
const shinheeLoanTermMonths = 360;
const shinheeMonthlyRate = loans.shinhee.rate / 100 / 12;
const shinheeAmortizationMonths = shinheeLoanTermMonths - shinheeGraceMonths;
const shinheeScheduledMonthlyPayment = getEqualPrincipalAndInterestPayment(
  loans.shinhee.amount,
  shinheeMonthlyRate,
  shinheeAmortizationMonths
);

Chart.defaults.font.family = "'Noto Sans KR', sans-serif";
Chart.defaults.maintainAspectRatio = false;

let projectionChart;
let cashFlowChart;

const debtDoughnutChart = new Chart(document.getElementById('debtDoughnutChart').getContext('2d'), {
  type: 'doughnut',
  data: {
    labels: loanValues.map((loan) => loan.name),
    datasets: [
      {
        data: loanValues.map((loan) => loan.amount),
        backgroundColor: ['#10B981', '#EF4444', '#F97316', '#3B82F6'],
        borderWidth: 0
      }
    ]
  },
  options: {
    plugins: {
      legend: { position: 'bottom', labels: { boxWidth: 12 } },
      tooltip: {
        callbacks: {
          label(context) {
            const name = context.label || '';
            const value = context.raw || 0;
            const percentage = (value / totalDebt * 100).toFixed(1);
            return `${name}: ${(value / 10000).toLocaleString()}만원 (${percentage}%)`;
          }
        }
      }
    },
    cutout: '60%'
  }
});

const rateBarChart = new Chart(document.getElementById('rateBarChart').getContext('2d'), {
  type: 'bar',
  data: {
    labels: loanValues.map((loan) => loan.name),
    datasets: [
      {
        label: '이자율 (%)',
        data: loanValues.map((loan) => loan.rate),
        backgroundColor: ['#10B981', '#EF4444', '#F97316', '#3B82F6'],
        borderRadius: 6
      }
    ]
  },
  options: {
    scales: {
      y: { beginAtZero: true, grid: { display: false } },
      x: { grid: { display: false } }
    },
    plugins: {
      legend: { display: false }
    }
  }
});

function initSimulationCharts() {
  const projectionCtx = document.getElementById('projectionChart').getContext('2d');
  projectionChart = new Chart(projectionCtx, {
    type: 'line',
    data: {
      labels: Array.from({ length: 25 }, (_, i) => `${i}개월`),
      datasets: [
        {
          label: '부산은행 잔액',
          data: [],
          borderColor: '#EF4444',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          fill: true,
          tension: 0.3
        },
        {
          label: '연금저축 담보대출 잔액(시뮬레이션)',
          data: [],
          borderColor: '#3B82F6',
          borderDash: [5, 5],
          tension: 0.1
        }
      ]
    },
    options: {
      scales: {
        y: { beginAtZero: true }
      },
      plugins: {
        tooltip: {
          callbacks: {
        label(context) {
              return `${context.dataset.label}: ${Math.round(context.raw / 10000).toLocaleString()}만원`;
            }
          }
        }
      }
    }
  });

  const cashFlowCtx = document.getElementById('cashFlowChart').getContext('2d');
  cashFlowChart = new Chart(cashFlowCtx, {
    type: 'bar',
    data: {
      labels: ['1년차(거치기간)', '2년차(원리금균등)'],
      datasets: [
        { label: '이자', data: [], backgroundColor: '#94A3B8' },
        { label: '연금 원금', data: [pensionPrincipalMonthly, pensionPrincipalMonthly], backgroundColor: '#3B82F6' },
        { label: '신희타 약정 원금', data: [0, 0], backgroundColor: '#10B981' },
        { label: '추가 상환', data: [], backgroundColor: '#EF4444' }
      ]
    },
    options: {
      scales: {
        x: { stacked: true },
        y: { stacked: true, beginAtZero: true }
      }
    }
  });
}

function formatCurrency(value) {
  const amount = Math.max(0, Math.round(Number(value) || 0));
  return `${amount.toLocaleString()}원`;
}

function getMonthlyInterest(balance, annualRate) {
  if (balance <= 0) return 0;
  return Math.round(balance * annualRate / 100 / 12);
}

function getEqualPrincipalAndInterestPayment(principal, monthlyRate, months) {
  if (principal <= 0 || months <= 0) return 0;
  if (monthlyRate <= 0) return Math.round(principal / months);
  return Math.round((principal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -months)));
}

function getShinheeMonthlyBreakdown(month, balance) {
  const safeBalance = Math.max(0, Math.round(Number(balance) || 0));
  const interest = getMonthlyInterest(safeBalance, loans.shinhee.rate);
  if (month <= shinheeGraceMonths || safeBalance <= 0) {
    return { principal: 0, interest, payment: interest };
  }

  const principal = Math.min(safeBalance, Math.max(0, shinheeScheduledMonthlyPayment - interest));
  return { principal, interest, payment: principal + interest };
}

function projectLoanBalances(extraMonthlyPayment, months) {
  const extra = Math.max(0, Number(extraMonthlyPayment) || 0);
  const balances = {
    shinhee: loans.shinhee.amount,
    busan: loans.busan.amount,
    samsung: loans.samsung.amount,
    pension: loans.pension.amount
  };

  for (let month = 1; month <= months; month++) {
    const busanPrincipal = Math.min(extra, balances.busan);
    const pensionPrincipal = Math.min(pensionPrincipalMonthly, balances.pension);
    const shinheeBreakdown = getShinheeMonthlyBreakdown(month, balances.shinhee);

    balances.busan -= busanPrincipal;
    balances.pension -= pensionPrincipal;
    balances.shinhee -= shinheeBreakdown.principal;
  }

  return balances;
}

function addPhaseTotals(phase) {
  const principalTotal = Object.values(phase.principal).reduce((sum, value) => sum + value, 0);
  const interestTotal = Object.values(phase.interest).reduce((sum, value) => sum + value, 0);
  return {
    ...phase,
    principalTotal,
    interestTotal,
    paymentTotal: principalTotal + interestTotal
  };
}

function buildPhasePaymentBreakdown(extraMonthlyPayment) {
  const phase1Balances = projectLoanBalances(extraMonthlyPayment, 0);
  const phase2Balances = projectLoanBalances(extraMonthlyPayment, 12);
  const extra = Math.max(0, Number(extraMonthlyPayment) || 0);
  const phase1Shinhee = getShinheeMonthlyBreakdown(1, phase1Balances.shinhee);
  const phase2Shinhee = getShinheeMonthlyBreakdown(13, phase2Balances.shinhee);

  const phase1 = addPhaseTotals({
    principal: {
      shinhee: phase1Shinhee.principal,
      busan: Math.min(extra, phase1Balances.busan),
      samsung: 0,
      pension: Math.min(pensionPrincipalMonthly, phase1Balances.pension)
    },
    interest: {
      shinhee: phase1Shinhee.interest,
      busan: getMonthlyInterest(phase1Balances.busan, loans.busan.rate),
      samsung: getMonthlyInterest(phase1Balances.samsung, loans.samsung.rate),
      pension: getMonthlyInterest(phase1Balances.pension, loans.pension.rate)
    }
  });

  const phase2 = addPhaseTotals({
    principal: {
      shinhee: phase2Shinhee.principal,
      busan: Math.min(extra, phase2Balances.busan),
      samsung: 0,
      pension: Math.min(pensionPrincipalMonthly, phase2Balances.pension)
    },
    interest: {
      shinhee: phase2Shinhee.interest,
      busan: getMonthlyInterest(phase2Balances.busan, loans.busan.rate),
      samsung: getMonthlyInterest(phase2Balances.samsung, loans.samsung.rate),
      pension: getMonthlyInterest(phase2Balances.pension, loans.pension.rate)
    }
  });

  return { phase1, phase2 };
}

function updateText(id, value) {
  const element = document.getElementById(id);
  if (element) element.innerText = value;
}

function applyPhaseBreakdown(prefix, phase) {
  updateText(`${prefix}PrincipalShinhee`, formatCurrency(phase.principal.shinhee));
  updateText(`${prefix}PrincipalBusan`, formatCurrency(phase.principal.busan));
  updateText(`${prefix}PrincipalSamsung`, formatCurrency(phase.principal.samsung));
  updateText(`${prefix}PrincipalPension`, formatCurrency(phase.principal.pension));
  updateText(`${prefix}InterestShinhee`, formatCurrency(phase.interest.shinhee));
  updateText(`${prefix}InterestBusan`, formatCurrency(phase.interest.busan));
  updateText(`${prefix}InterestSamsung`, formatCurrency(phase.interest.samsung));
  updateText(`${prefix}InterestPension`, formatCurrency(phase.interest.pension));
  updateText(`${prefix}PrincipalTotal`, formatCurrency(phase.principalTotal));
  updateText(`${prefix}InterestTotal`, formatCurrency(phase.interestTotal));
  updateText(`${prefix}PaymentTotal`, formatCurrency(phase.paymentTotal));
}

function updateTimelinePaymentDetails(extraMonthlyPayment) {
  const breakdown = buildPhasePaymentBreakdown(extraMonthlyPayment);
  applyPhaseBreakdown('phase1', breakdown.phase1);
  applyPhaseBreakdown('phase2', breakdown.phase2);
  return breakdown;
}

function updateSimulation(extraMonthlyPayment) {
  const extra = Number(extraMonthlyPayment) || 0;
  const valueDisplay = document.getElementById('paymentValueDisplay');
  if (valueDisplay) valueDisplay.innerText = extra.toLocaleString();

  let busanBalance = loans.busan.amount;
  let pensionBalance = loans.pension.amount;
  const busanData = [busanBalance];
  const pensionData = [pensionBalance];

  for (let month = 1; month <= 24; month++) {
    pensionBalance -= pensionPrincipalMonthly;
    if (pensionBalance < 0) pensionBalance = 0;
    pensionData.push(pensionBalance);

    busanBalance -= extra;
    if (busanBalance < 0) busanBalance = 0;
    busanData.push(busanBalance);
  }

  projectionChart.data.datasets[0].data = busanData;
  projectionChart.data.datasets[1].data = pensionData;
  projectionChart.update();

  const year1Balance = Math.round(busanData[12] / 10000);
  const year2Balance = Math.round(busanData[24] / 10000);

  const result1 = document.getElementById('resultBusanBalance');
  const result2 = document.getElementById('resultBusanBalanceYear2');
  if (result1) result1.innerText = `${year1Balance.toLocaleString()} 만원`;
  if (result2) result2.innerText = `${year2Balance.toLocaleString()} 만원`;

  const phaseBreakdown = updateTimelinePaymentDetails(extra);
  cashFlowChart.data.datasets[0].data = [phaseBreakdown.phase1.interestTotal, phaseBreakdown.phase2.interestTotal];
  cashFlowChart.data.datasets[1].data = [phaseBreakdown.phase1.principal.pension, phaseBreakdown.phase2.principal.pension];
  cashFlowChart.data.datasets[2].data = [phaseBreakdown.phase1.principal.shinhee, phaseBreakdown.phase2.principal.shinhee];
  cashFlowChart.data.datasets[3].data = [phaseBreakdown.phase1.principal.busan, phaseBreakdown.phase2.principal.busan];
  cashFlowChart.update();
}

function setupTabs() {
  const tabs = document.querySelectorAll('.strategy-tab');
  const contents = document.querySelectorAll('.strategy-content');

  const applyActiveTab = (tab) => {
    tabs.forEach((button) => {
      button.classList.remove('bg-slate-800', 'text-white', 'shadow-lg');
      button.classList.add('bg-white', 'text-slate-600', 'hover:bg-slate-100');
    });

    tab.classList.remove('bg-white', 'text-slate-600', 'hover:bg-slate-100');
    tab.classList.add('bg-slate-800', 'text-white', 'shadow-lg');

    const targetId = tab.getAttribute('data-target');
    contents.forEach((panel) => panel.classList.add('hidden'));
    if (targetId) {
      const target = document.getElementById(targetId);
      if (target) target.classList.remove('hidden');
    }
  };

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => applyActiveTab(tab));
  });

  if (tabs[0]) applyActiveTab(tabs[0]);
}

function init() {
  const slider = document.getElementById('extraPaymentRange');
  const initial = slider ? Number(slider.value) || 500000 : 500000;

  initSimulationCharts();
  setupTabs();
  updateSimulation(initial);

  if (slider) {
    slider.addEventListener('input', (event) => {
      updateSimulation(event.target.value);
    });
  }
}

document.addEventListener('DOMContentLoaded', init);


