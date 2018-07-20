console.time('Runtime');
const url = 'http://api.census.gov/data/2015/acs5?get=B01003_001E,B01001_002E,B01001_026E,B19001_002E,B19001_003E,B19001_004E,B19001_005E,B19001_006E,B19001_007E,B19001_008E,B19001_009E,B19001_010E,B19001_011E,B19001_012E,B19001_013E,B19001_014E,B19001_015E,B19001_016E,B19001_017E&for=zip+code+tabulation+area:*&key=d80af7f664d381e4b2fdb5be89b989bf0ae23c7b';
const request = require('request');

const baseZipCode = process.argv[2];

if (baseZipCode === undefined) {
    console.log('please enter a zipcode \n');
    console.log('Usage: node index.js <zipcode>');
    return;

} else {
    console.log('Fetching data from census api...');
    request(url, {
        json: true
    }, (err, res, body) => {

        if (err) {
            return console.log(err);
        }
        buildData(body);
    });

}

function buildData(body) {
    const zipCodeArrays = [];

    //Find where the zip code index is in data row
    const zipCodeIndex = body[0].indexOf("zip code tabulation area");

    let baseZipCodeData;

    for (let i = 1; i < body.length; i++) {

        if (baseZipCode === body[i][zipCodeIndex]) {
            //keeping zipcode as part of comparison for sanity check against itself.
            //zipcode compared with zipcode == 100%
            baseZipCodeData = body[i];
        }

        zipCodeArrays.push(body[i]);
    }

    if (baseZipCodeData) {
        buildRelations(baseZipCodeData, zipCodeArrays);
    } else {
        console.log('error - zipcode not found in census database');
    }

    //potentially cache since census is super slow...
    // fs.writeFile("./data.json", JSON.stringify(body), function(err) {
    // });
}

function computeScore(base, comparison) {

    const b = parseInt(base);
    const c = parseInt(comparison);
    const range = Math.abs(base - comparison);

    if (range > base) {
        base = range + base;
    }

    return (100 - (100 * (range / base)));
}

function buildRelations(base, compare) {

    //weighing all attributes the same, ignore zipcode from keyscore.
    const keyScore = base.length - 1;
    const finalResult = [];

    compare.forEach((iter) => {
        let score = 0;

        //clear the zipcode from comparisons
        const zipCode = iter.pop();

        for (let i = 0; i < iter.length; i++) {

            score += computeScore(base[i], iter[i]) * (1 / keyScore);
        }

        finalResult.push({
            zipCode: zipCode,
            score: score
        })
    });
    finalResult.sort((a, b) => {
        return b.score - a.score;
    });

    prettyResults(finalResult, 10);

}

//Takes an array as arr. n is how many results we would like to see
function prettyResults(arr, n) {

    let i = 0;

    while (i < n) {
        let number = i + 1;
        number = number.toString() + '.';
        console.log(`${number.padEnd(3)} ${arr[i].zipCode}, ${arr[i].score.toFixed(2)}`);
        i++
    }
    console.log('');
    //checking execution time for performance
    console.timeEnd('Runtime');
}