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

(async() => {
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
        let totalCancelQty = 0; 
        let totalConfirmQty = 0; 
        let totalRejectedQty = 0;
        let income = 0.00;


        /**
         * Call order api.
         */
        const response = await sendGet("", `/api/v2/order?page=${page}&limit=${PER_PAGE}&reportYear=${REPORT_FOR_YEAR}`, token);

        const data = JSON.parse(response);
    
        /**
         * Calculate concurrently for better performance and reduce execution time. 
         */
        const calculateResults = await Promise.all([
            calculateOrder(data.items, "cancel"),
            calculateOrder(data.items, "confirm"),
            calculateOrder(data.items, "rejected"),
            calculateAmount(data.items, "confirm"),
            calculateAmount(data.items, "cancel"),
        ]);

        totalCancelQty += calculateResults[0];
        totalConfirmQty += calculateResults[1];
        totalRejectedQty += calculateResults[2];
        
        income += calculateResults[3];

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
         * Call api concurrently for batter performance and reduce excuting time.
         */
        const responses = await Promise.all(promises);
        promises = null;
        for(let response of responses){
            
            const data = JSON.parse(response);

            /**
             * Calculate concurrently for better performance and reduce execution time.
             */
            const calculateResults = await Promise.all([
                calculateOrder(data.items, "cancel"),
                calculateOrder(data.items, "confirm"),
                calculateOrder(data.items, "rejected"),
                calculateAmount(data.items, "confirm"),
            ]);

            totalCancelQty += calculateResults[0];
            totalConfirmQty += calculateResults[1];
            totalRejectedQty += calculateResults[2];

            income += calculateResults[3];
        }

        console.log(`Total Income: ${income}`);
        console.log("=============================================================================================");
        console.log(`TotalCancel: ${totalCancelQty} TotalConfirm: ${totalConfirmQty}} TotalRejcted: ${totalRejectedQty}}`);

    }catch(error){
        console.log(error?.message);
    }

})();