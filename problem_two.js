const https = require('https');

/**
 * Send get request
 * 
 * @param {*} host 
 * @param {*} apiEndpoint 
 * @param {*} token 
 * @returns 
 */
const sendGet = async (host, apiEndpoint, token) => {
    return new Promise((resolve, reject) => {
        const httspRequest = https.request({
            host: host,
            path: apiEndpoint,
            method: "GET",
            headers: {
                'Content-Type': 'applicaton/json',
                'X-Requested-With': 'XMLHttpRequest',
                'Authorization': `Bearer ${token}`
            }
        });

        httspRequest
        .addListener("response", response => {
            let content = "";
            response.on("data", data => {
                content += data;
            });
            response.on("end", () => resolve(content));
            response.on("error", err => reject(err));
        });

        httspRequest.addListener("error", err => {
            reject(err);
        });

        httspRequest.end();
    });
}

/**
 * Send post request
 * 
 * @param {*} host 
 * @param {*} apiEndpoint 
 * @param {*} data 
 * @returns 
 */
const sendPost = async (host, apiEndpoint, data = null) => {
    return new Promise((resolve, reject) => {
        const httspRequest = https.request({
            host: host,
            path: apiEndpoint,
            method: "POST",
            headers:{
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            }
        });

        httspRequest
        .addListener("response", response => {
            let content = "";
            response.on("data", data => {
                content += data;
            });
            response.on("end", () => resolve(content) );
            response.on("error", err => reject(err));
        });

        httspRequest.addListener("error", err => {
            console.log(err);
            reject(err);
        });

        httspRequest.write(data);
        httspRequest.end();
    });
}

/**
 * Authenticate to server
 * 
 * @param {*} userName 
 * @param {*} email 
 * @returns 
 */
const authenticate = async (userName, email) => {
    const authResponse = await sendPost("", "/api/auth/login", JSON.stringify({userName:userName, email:email}));
    /**
     * auth response confirm valid json string. also confirm status and token property
     * in response. so you can parse directly. 
     * 
     */
    if(JSON.parse(authResponse).status){
        return JSON.parse(authResponse).token;
    }
    return null
}

/**
 * Count order based on diff status
 * 
 * @param {*} items 
 * @param {*} status 
 * @returns 
 */
const calculateOrder = async (items, status) => items.filter( item => item.status === status)?.reduce( (total, item) => total += item.qty, 0);

/**
 * Aggregate price based in diff status
 * 
 * @param {*} items 
 * @param {*} status 
 * @returns 
 */
const calculateAmount = async (items, status) => items.filter(item => item.status === status)?.reduce( (total, item) => total += (parseFloat(item.amount) * 100), 0);


const chartIncome = {Jan: 0, Feb: 0, Mar: 0, Apr: 0, May: 0, Jun: 0, Jul: 0, Aug: 0, Sep: 0, Oct: 0, Nov: 0, Dec: 0,};
const chartConfirmQty = {Jan: 0, Feb: 0, Mar: 0, Apr: 0, May: 0, Jun: 0, Jul: 0, Aug: 0, Sep: 0, Oct: 0, Nov: 0, Dec: 0,};
const chartCancelQty = {Jan: 0, Feb: 0, Mar: 0, Apr: 0, May: 0, Jun: 0, Jul: 0, Aug: 0, Sep: 0, Oct: 0, Nov: 0, Dec: 0,};
const chartRejectedQty = {Jan: 0, Feb: 0, Mar: 0, Apr: 0, May: 0, Jun: 0, Jul: 0, Aug: 0, Sep: 0, Oct: 0, Nov: 0, Dec: 0,};

const buildChart = async (items, groupKey = "month") => {
    let visited = {};

    for (let key = 0, length = items.length; key < length; key++) {
        const searchKey = items[key][groupKey];
        items.sort((a, b) => a.status.localeCompare(b.status));
        if (!visited[searchKey]) {
            /**
             * Calculate concurrently for better performance and reduce execution time. 
             */
            const calculateResults = await Promise.all([
                calculateOrder(items.filter(item => item.month === searchKey), "cancel"),
                calculateOrder(items.filter(item => item.month === searchKey), "confirm"),
                calculateOrder(items.filter(item => item.month === searchKey), "rejected"),
                calculateAmount(items.filter(item => item.month === searchKey), "confirm"),
            ]);

            chartCancelQty[searchKey] += Number(calculateResults[0]);
            chartConfirmQty[searchKey] += Number(calculateResults[1]);
            chartRejectedQty[searchKey] += Number(calculateResults[2]);
            chartIncome[searchKey] = parseFloat(parseFloat( ( chartIncome[searchKey] * 100) + parseFloat(calculateResults[3]) ) / 100).toFixed(2);

            visited[searchKey] = true;
        }
    }
}

const executeApi = async () => {
    try{
        /**
         * Authenticate request
         */
        const token = await authenticate("test", "test@sss.com");
        if(!token){
            console.log("Access denied!");
            return;
        }

        const PER_PAGE = 10;
        const REPORT_FOR_YEAR = 2018;

        let totalPage = 1;
        let page = 1;
        let totalOrder = 0;

        /**
         * Call order api.
         */
        const response = await sendGet("", `/api/v2/order?page=${page}&limit=${PER_PAGE}&reportYear=${REPORT_FOR_YEAR}`, token);

        /**
         * Incoming response is json string so should parse it
         */
        const data = JSON.parse(response);
    
        /**
         * Prepare chart
         */
        await buildChart(data.items);

        /**
         * Just one time
         */
        totalOrder += data.totalRecord;
        totalPage = Math.ceil(data.totalRecord / PER_PAGE);
        page++;

        let promises = [];
        do{
            /**
             * Prepared all promise request for later capture concurrently
             */
            promises.push(sendGet("",`/api/v2/order?page=${page}&limit=${PER_PAGE}&reportYear=${REPORT_FOR_YEAR}`, token));
            page++;
        }while(page <= totalPage);

        /**
         * Calculate concurrently for better performance and reduce execution time. 
         */
        const responses = await Promise.all(promises);
        promises = null;

        for(let response of responses){
            /**
             * Incoming response is json string so should parse it
             */
            const data = JSON.parse(response);
    
            /**
             * Prepare chart
             */
            await buildChart(data.items);
        }
        

        /**
         * Return final chart data
         */
        return{
            year: REPORT_FOR_YEAR,
            labels: Object.keys(chartIncome),
            incomeInYear: Object.values(chartIncome),
            cancelQtyInYear: Object.values(chartCancelQty),
            confirmQtyInYear: Object.values(chartConfirmQty),
            rejectedQtyInYear: Object.values(chartRejectedQty)
        }
    }catch(error){
        console.log(error?.message);
    }
}

(async() => {
   const chart = await executeApi();
   console.log(chart);
})();