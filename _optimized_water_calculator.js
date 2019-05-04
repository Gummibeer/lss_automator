Array.prototype.sum = function () {
    return this.reduce((pv, cv) => pv + cv, 0);
};

Array.prototype.clone = function () {
    return this.slice(0);
};

Array.prototype.min = function() {
    return Math.min.apply(null, this);
};

Array.prototype.minLength = function() {
    return this.map(a => a.length).min();
};



function subset_sum(numbers, target, carry) {
    let result = {};
    for (let i = 0; i < numbers.length; i++) {
        let intCarry = typeof carry === 'undefined' ? [] : carry.clone();
        let remaining = numbers.clone();
        let n = remaining.splice(i, 1)[0];
        intCarry.push(n);

        if(intCarry.sum() >= target) {
            result[intCarry.sort((a, b) => a - b).join('-')] = intCarry;
            continue;
        }

        Object.assign(result, subset_sum(remaining, target, intCarry));
    }

    return Object.values(result);
}

function get_matching_vehicle_water_combination(vehicles, minVehicles, minWater) {
    let combinations = subset_sum(vehicles, minWater);
    combinations = combinations.filter(combination => combination.length >= minVehicles);
    let lowestCombinationLength = combinations.minLength();
    combinations = combinations.filter(combination => combination.length === lowestCombinationLength);
    combinations = combinations.sort((a, b) => a.sum() - b.sum());

    return combinations[0];
}

const VEHICLES = {
    10: 500,
    30: 2000,
    40: 1000,
    50: 1000,
    60: 2000,
};

console.log(get_matching_vehicle_water_combination(Object.values(VEHICLES),1, 800));
console.log(get_matching_vehicle_water_combination(Object.values(VEHICLES),1, 2000));
console.log(get_matching_vehicle_water_combination(Object.values(VEHICLES),1, 3000));
console.log(get_matching_vehicle_water_combination(Object.values(VEHICLES),2, 800));
