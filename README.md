## Introduction
It was November 2019, it's was my first node js back-end developer interview. i just share my interview experience here. hopefully, any junior developers get help from this code. this was my second round interview. problem statement has very long so i just mension main point of statement.

### Duration Time 1 hour 15 min 
Sorry i forgoted to sayed interview duration first time. I gave this interview on an online coding platform.

## Problem Statement One
You have two api endpoint like login and order api. 

### After read statement i found information of login api.

### Request:
* apiEndpoint : {{host}}/api/auth/login
* method: POST
* Content-Type: json
* data: email and password (should be json string)

Response: 
* status: true or false
* token: access token

*Note*: it's confirm thats,  response object an valid json structure and guarantee to present property(status and token) in response object.


### After read statement i found information of order api.

Request:
* apiEndpoint : {{host}}//api/v2/order
* method: GET
* Content-Type: json
* query:  page , limit and reportYear (type number)

Note: 
* reportYear =  2019 ( fixed )
* limi = 10( fixed).
  Just you need to calculate page.

Response: 
* status: true or false
* totalRecord:  number
* items: array of object
  * year: 2018, 
  * month: "Jan",
  * status: confirm, rejected and cancel
  * qty:  order qty (number)
  * amount: total amount (float)

### Response items:
```
 [
    {year: 2018, month: "Jan", status: "cancel", qty: 10, amount: "2150.00"},
    {year: 2018, month: "Feb", status: "cancel", qty: 10, amount: "2000.00"},
    {year: 2018, month: "Jan", status: "confirm", qty: 25, amount: "2250.00"},
    {year: 2018, month: "Jan", status: "rejected", qty: 15, amount: "1250.00"},
    {year: 2018, month: "Feb", status: "rejected", qty: 5, amount: "1250.00"},
    {year: 2018, month: "Feb", status: "confirm", qty: 5, amount: "1250.00"},
    {year: 2018, month: "Jan", status: "rejected", qty: 5, amount: "1250.00"},
    {year: 2018, month: "Mar", status: "confirm", qty: 5, amount: "1250.00"},
    {year: 2018, month: "Apr", status: "confirm", qty: 20, amount: "2025.00"},
    ......
]

```

*Note*: it's confirm thats,  response object an valid json structure and guarantee to present all property in response object.



### The complete step of implementation:

Step:
1. Login throw login api
2. Get access token from response after sucess. if failed print "Access denied!"
3. Request order information throw order api with access token
4. Calculate total qty of status of confirm, rejected and cancel
5. Calculate income( status of confirm)

### Some restriction of test case:
1. Don't use  fetch, axios and any thrid party api
2. Should be excution time 100 ms of all process 

*Note*: I don't remember exactly how many records were in the database.


## Problem Statement two
Required All functionality thats i mensioned above, just Build simple data structure like below. so i copy all above function and defined new function for build simple data structure.

### After read statement i found New requirement.
1. build data structure for showing  simple statistics for every month of year
2. If no any data(income, all qty property) available for any month its should be 0 for each property.

```
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

      ....................

        /**
         * Prepare chart
         */
        await buildChart(data.items);

      .........................

        for(let response of responses){
            ..............
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

const chart = await executeApi();
console.log(chart);
//print
{
  year: 2018,
  labels: ['Jan', 'Feb', 'Mar','Apr', 'May', 'Jun','Jul', 'Aug', 'Sep''Oct', 'Nov','Dec'],
  incomeInYear: ['200.00', '600.00', '480.00', '675.00', 0,'5000.00', 0, '5000.00','5000.00', 0,'5000.00', 0],
  cancelQtyInYear: [8, 8, 48, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  confirmQtyInYear: [20, 20, 20, 24, 0, 20, 0, 20, 20, 0, 20, 0],
  rejectedQtyInYear: [48, 20, 0, 0, 0, 40, 0, 0, 0, 0, 0, 0]
}

```
