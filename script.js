async function calculateMetrics(fileContent) {
    const lines = fileContent.split('\n').filter(line => line.trim());
    
    let dailyVolume = 0;
    let dailyValue = 0; 
    let productVolumes = {};
    let staffSales = {};
    let hourlyTransactions = {};
    
    for (const line of lines) {
        const [staffId, timestamp, products, amount] = line.split(',');
        
        const productList = products.slice(1, -1).split('|');
        for (const product of productList) {
            const [id, quantity] = product.split(':');
            productVolumes[id] = (productVolumes[id] || 0) + Number(quantity);
        }
        
        const date = timestamp.split('T')[0];
        const hour = timestamp.split('T')[1].split(':')[0];
        
        dailyVolume += productList.reduce((sum, p) => sum + Number(p.split(':')[1]), 0);
        dailyValue += Number(amount);
        
        const month = date.slice(0, 7);
        staffSales[month] = staffSales[month] || {};
        staffSales[month][staffId] = (staffSales[month][staffId] || 0) + Number(amount);
        
        hourlyTransactions[hour] = hourlyTransactions[hour] || { count: 0, volume: 0 };
        hourlyTransactions[hour].count++;
        hourlyTransactions[hour].volume += productList.reduce((sum, p) => sum + Number(p.split(':')[1]), 0);
    }
    
    const mostSoldProduct = Object.entries(productVolumes)
        .sort((a, b) => b[1] - a[1])[0][0];
    
    const monthlyTopStaff = {};
    for (const [month, staff] of Object.entries(staffSales)) {
        monthlyTopStaff[month] = Object.entries(staff)
            .sort((a, b) => b[1] - a[1])[0][0];
    }
    
    const bestHour = Object.entries(hourlyTransactions)
        .sort((a, b) => (b[1].volume / b[1].count) - (a[1].volume / a[1].count))[0][0];
    
    return {
        highestDailyVolume: dailyVolume,
        highestDailyValue: dailyValue.toFixed(2),
        mostSoldProductId: mostSoldProduct,
        monthlyTopStaff: monthlyTopStaff,
        peakHour: bestHour,
        productVolumes,
        staffSales,
        hourlyTransactions
    };
}

async function combineMetrics(metricsArray) {
    let totalVolume = 0;
    let totalValue = 0;
    let combinedProductVolumes = {};
    let combinedStaffSales = {};
    let combinedHourlyTransactions = {};

    metricsArray.forEach(metrics => {
        totalVolume += metrics.highestDailyVolume;
        totalValue += parseFloat(metrics.highestDailyValue);

        Object.entries(metrics.productVolumes).forEach(([id, volume]) => {
            combinedProductVolumes[id] = (combinedProductVolumes[id] || 0) + volume;
        });

        Object.entries(metrics.staffSales).forEach(([month, staff]) => {
            combinedStaffSales[month] = combinedStaffSales[month] || {};
            Object.entries(staff).forEach(([id, sales]) => {
                combinedStaffSales[month][id] = (combinedStaffSales[month][id] || 0) + sales;
            });
        });

        Object.entries(metrics.hourlyTransactions).forEach(([hour, data]) => {
            combinedHourlyTransactions[hour] = combinedHourlyTransactions[hour] || { count: 0, volume: 0 };
            combinedHourlyTransactions[hour].count += data.count;
            combinedHourlyTransactions[hour].volume += data.volume;
        });
    });

    const topProduct = Object.entries(combinedProductVolumes)
        .sort((a, b) => b[1] - a[1])[0][0];

    const monthlyTopStaff = {};
    Object.entries(combinedStaffSales).forEach(([month, staff]) => {
        monthlyTopStaff[month] = Object.entries(staff)
            .sort((a, b) => b[1] - a[1])[0][0];
    });

    const bestHour = Object.entries(combinedHourlyTransactions)
        .sort((a, b) => (b[1].volume / b[1].count) - (a[1].volume / a[1].count))[0][0];

    return {
        totalVolume,
        totalValue: totalValue.toFixed(2),
        topProduct,
        monthlyTopStaff,
        bestHour
    };
}

document.getElementById('fileInput').addEventListener('change', async (event) => {
    const files = Array.from(event.target.files);
    if (!files.length) return;

    const metricsArray = [];
    const individualMetrics = document.getElementById('individualMetrics');
    individualMetrics.innerHTML = '<h2>Individual File Results:</h2>';

    for (const file of files) {
        const reader = new FileReader();
        const metrics = await new Promise((resolve) => {
            reader.onload = async (e) => {
                const content = e.target.result;
                const result = await calculateMetrics(content);
                resolve(result);
            };
            reader.readAsText(file);
        });

        metricsArray.push(metrics);
        
        individualMetrics.innerHTML += `
            <div class="file-metrics">
                <div class="file-name">${file.name}</div>
                <div>Sales Volume: ${metrics.highestDailyVolume}</div>
                <div>Sales Value: $${metrics.highestDailyValue}</div>
                <div>Top Product: ${metrics.mostSoldProductId}</div>
                <div>Peak Hour: ${metrics.peakHour}:00</div>
            </div>`;
    }

    const combined = await combineMetrics(metricsArray);
    document.getElementById('metricsContainer').style.display = 'block';
    document.getElementById('totalVolume').textContent = combined.totalVolume;
    document.getElementById('totalValue').textContent = '$' + combined.totalValue;
    document.getElementById('topProduct').textContent = combined.topProduct;
    document.getElementById('peakHour').textContent = `${combined.bestHour}:00`;

    const monthlyStaffDiv = document.getElementById('monthlyStaff');
    monthlyStaffDiv.innerHTML = '';
    Object.entries(combined.monthlyTopStaff).forEach(([month, staffId]) => {
        monthlyStaffDiv.innerHTML += `<div>${month}: Staff #${staffId}</div>`;
    });
});