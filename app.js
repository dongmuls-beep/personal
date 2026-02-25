const loans = {
  shinhee: { name: 'Shinhee-ta Mortgage', amount: 232_119_000, rate: 1.6, monthlyInterest: 309_492, type: 'mortgage' },
  busan: { name: 'Busan Bank Loan', amount: 43_000_000, rate: 4.5, monthlyInterest: 161_250, type: 'credit' },
  samsung: { name: 'Samsung Life Insurance', amount: 11_170_000, rate: 4.12, monthlyInterest: 38_350, type: 'insurance' },
  pension: { name: 'Pension Loan', amount: 9_500_000, rate: 3.0, monthlyInterest: 23_750, type: 'pension' }
};

const loanValues = Object.values(loans);
const totalDebt = loanValues.reduce((acc, loan) => acc + loan.amount, 0);
const pensionPrincipalMonthly = 400_000;
const shinheePrincipalMonthlyStartYear2 = 520_000;

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
      labels: Array.from({ length: 25 }, (_, i) => `${i} Month`),
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
          label: '연금부채 잔액(시뮬레이션)',
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
      labels: ['Year 1 (Current)', 'Year 2 (Shinhee principal starts)'],
      datasets: [
        { label: '이자', data: [], backgroundColor: '#94A3B8' },
        { label: '연금 원금', data: [pensionPrincipalMonthly, pensionPrincipalMonthly], backgroundColor: '#3B82F6' },
        { label: '신한 은행 원금', data: [0, shinheePrincipalMonthlyStartYear2], backgroundColor: '#10B981' },
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

  cashFlowChart.data.datasets[0].data = [530_000, 480_000];
  cashFlowChart.data.datasets[3].data = [extra, extra];
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

