//  Copyright (c) 2018 Pollere, Inc. All rights reserved.

// local variables and functions first

//parameters that might be made settable through web interface in future
const rtdBound = 500;       //milliseconds, discard values above this
const seqDiffIgnore = 10;   //bytes
const dupDiffIgnore = .0002; //sec
const stripTimeWidth = 60.0;   //width of strip chart in seconds
const cleanUpInterval = 600.;   //ten minutes of data
const maxIdle = 1200. * 1000;   //twenty minutes (msec)

//data structures
const hi = {};      //keeps host information
const hostId = [];
const maxHosts = 40;
const sideInfo = {}; //array of object with per-host info on CP "side" (side = 0 or 1)
let sideData = []; //array of per CP "side" data processed from latest interval/chunk
const cpSide = [];  //persistent across intervals capture point side (0 or 1) information

// plot parameters
const hostColor = [
    "rgb(0, 0, 0)",
    "rgb(0, 73, 73)", 
    "rgb(0, 146, 146)", 
    "rgb(255, 109, 182)", 
    "rgb(255, 182, 219)", 
    "rgb(73, 0, 146)", 
    "rgb(0, 109, 219)", 
    "rgb(182, 109, 255)", 
    "rgb(109, 182, 255)", 
    "rgb(182, 219, 255)", 
    "rgb(146, 0, 0)", 
    "rgb(146, 73, 0)", 
    "rgb(219, 109, 0)", 
    "rgb(36, 255, 36)", 
    "rgb(255, 255, 109)" 
];

const hostColorCnt = hostColor.length;
const hostShape = [
    "circle",
    "square",
    "diamond",
    "cross",
    "x",
    "triangle-up",
    "triangle-down",
    "triangle-left",
    "triangle-right",
    "pentagon",
    "hexagon",
    "star",
    "asterisk",
    "diamond-tall"
];
const hostShapeCnt = hostShape.length;

let startTime, lstCleanUp;
let singleSide = false;

//plotly trace params for each trace
const trInfo = {};
trInfo["pd"] = {
        name: "ppings",
        mode: "markers",
        hoverinfo: "all",
        type: "scattergl"
    };
trInfo["sd"] = {
        name: "seqno rtt",
        mode: "markers",
        hoverinfo: "all",
        type: "scattergl"
    };
trInfo["oo"] = {
        name: "out-of-order seqno",
        mode: "markers",
        hoverinfo: "x" + "text",
        type: "scattergl"
    };
trInfo["dp"] = {
        name: "dup ack",
        mode: "markers",
        hoverinfo: "x" + "text",
        type: "scattergl"
    };
//for size and placement of subplots, sides and rows
let col = [[0,.46],[.54,1]];
let r1 = [.57,1];
let r2 = [.13,.56];
let r3 = [0,.1];

//annotation info for bottom strip (subplots 3 and 6)
let ooda = {
    xref: "paper",
    yref: "paper",
    x: 0.5,
    xanchor: "middle",
    y: 0.5*(r3[1]-r3[0]),
    yanchor: "middle",
    text: "duplicate ACKs",
    font: { family: "Helvetica",
            size: 10,
            color: "black" },
    showarrow: false
};
let oohl = Object.assign({}, ooda, {y: 0.75*(r3[1]-r3[0])}, {text: "holes in sequence"});
let oola = Object.assign({}, ooda, {y: 0.25*(r3[1]-r3[0])}, {text: "late arrivals"});
let oosd = Object.assign({}, ooda, {y: +0}, {xanchor: "left"}, {yanchor: "top"});

let trNum = new Array(2);
for (var i = 0; i < 2; i++) {
  trNum[i] = [];
}

/*
 * Set up strip chart subplots with empty traces initially.
 * pdiv is the plot div where the plot is going
 * there are six subplots, three stacked [1,2,3] for each side s [0,1]
 * top is ppings, middle is seqno rtd, bottom shows outoforders, dup acks
*/

function initStripCharts(pdiv) {
    let layout = {
        autosize: false,
        height: window.innerHeight - document.getElementById("info").clientHeight - 40,
        width: window.innerWidth - 10,
        dragmode: "pan",
        showlegend: false,
        legend: { "orientation": "h" },
        margin: { l: 60, r: 15, b: 35, t: 10, pad: 0 },
        paper_bgcolor: "#c7c7c7",
        plot_bgcolor: "#f1f1f1",
        textfont: {family:"Helvetica", size: 8 },
        xaxis: {
            type: "date",
            anchor: "y",
            domain: col[0],
            tickfont: {size: 10},
            showticklabels: false
        },
        yaxis: {
            domain: r1,
            autorange: true,
            anchor: "x",
            rangemode: "nonnegative",
            title: "pping RTT (ms) [side0]",
            titlefont: {family: "Helvetica", size: 12}
        },
        xaxis4: {
            type: "date",
            domain: col[1],
            showticklabels: false
        },
        xaxis5: {
            type: "date",
            anchor: "y5",
            domain: col[1],
            tickfont: {size: 10}
        },
        xaxis2: {
            type: "date",
            anchor: "y2",
            domain: col[0],
            tickfont: {size: 10}
        },
        xaxis3: {
            type: "date",
            anchor: "y3",
            domain: col[0],
            showticklabels: false
        },
        xaxis6: {
            type: "date",
            anchor: "y6",
            domain: col[1],
            showticklabels: false
        },
        yaxis2: {
            domain: r2,
            autorange: true,
            anchor: "x2",
            rangemode: "nonnegative",
            title: "seqno RTT (ms) [side0]",
            titlefont: {family: "Helvetica", size: 12}
        },
        yaxis3: {
            domain: r3,
            autorange: true,
            anchor: "x3",
            range: [-1.5,1.5],
            showticklabels: false
        },
        yaxis6: {
            domain: r3,
            anchor: "x6",
            range: [-1.5,1.5],
            showticklabels: false
        },
        yaxis4: {
            domain: r1,
            autorange: true,
            anchor: "x4",
            rangemode: "nonnegative",
            title: "pping RTT (ms) [side1]",
            titlefont: {family: "Helvetica", size: 12}
        },
        yaxis5: {
            domain: r2,
            autorange: true,
            anchor: "x5",
            rangemode: "nonnegative",
            title: "seqno RTT (ms) [side1]",
            titlefont: {family: "Helvetica", size: 12}
        },
        scrollZoom: true
    };

    Plotly.newPlot (pdiv, [], layout,
        {   scrollZoom: true,           //config
            displaylogo: false,
            modeBarButtonsToRemove: ['sendDataToCloud',
                'select2d','lasso2d','zoomIn2d','zoomOut2d']
        });
}

/*
 * Build and update plotly traces through addTrace and extendTraces
 * update is an object containing key-value pairs
 * each value is an array and can be an array of arrays, where each
 *  inner array applies to a specific trace index
 * must pass the list of indices being updated
 * The trace gets to the right subplot by using correct xaxis and yaxis
*/

function updateTraces(pdiv, lt) {
    //object for axis layout updates
    let layout = {};
    //new x range converted to ms
    let xr = [(lt-stripTimeWidth)*1000,(lt)*1000];

    let newTr = [];     //used for adding new traces
    let i = pdiv.data.length;   //start for new trace index
    //updates for rtds
    let indices = [];
    // for ppings and seqno rtds to do on same update
    let update = {
        x: [],
        y: [],
        'marker.color': [],
        'marker.symbol': [],
        text: []
    };

    for(let s=0; s<2; s++) {    //for each side
        let c = cpSide[s];
        if(c !== undefined) {
            //update time axes for all existing subplots even if no points this interval
            if(c.rpdCnt !== undefined) {
                let nm = s === 1 ?  "xaxis4.range": "xaxis.range";
                layout[nm] = xr;
            }
            if(c.rsdCnt !== undefined) {
                let nm = s === 1 ?  "xaxis5.range": "xaxis2.range";
                layout[nm] = xr;
            }
            if(c.oo === true || c.da === true) {
                let nm = s === 1 ?  "xaxis6.range": "xaxis3.range";
                layout[nm] = xr;
            }
        }
        let d = sideData[s];
        if(d === undefined)
            continue;

        if(d.tpd.length) {
            let p = 3*s + 1;        //3 rows per side, ppings go in row 1
            if(trNum[s]["pd"] !== undefined) {
                indices.push( trNum[s]["pd"] );
                update.x.push(d.tpd);
                update.y.push(d.rpd);
                update["marker.color"].push(d.cpd);
                update["marker.symbol"].push(d.spd);
                update.text.push(d.fpd);
            } else {
                trNum[s]["pd"] = i++;
                let nm = p > 1 ?  "x" + p : "x";
                let trDat = Object.assign({}, trInfo["pd"]);
                trDat["xaxis"] = nm;
                nm = p > 1 ?  "y" + p : "y";
                trDat["yaxis"] = nm;
                trDat["x"] = d.tpd;
                trDat["y"] = d.rpd;
                trDat["text"] = d.fpd;
                trDat["marker"] = {
                    size: 4,
                    color: d.cpd,
                    symbol: d.spd
                };
                newTr.push(trDat);
            }
        } 
        //seqno rtd
        if(d.tsd.length) {
            let p = 3*s + 2;        //seqno rtts go in row 2
            if(trNum[s]["sd"] !== undefined) {
                indices.push( trNum[s]["sd"] );
                update.x.push(d.tsd);
                update.y.push(d.rsd);
                update["marker.color"].push(d.csd);
                update["marker.symbol"].push(d.ssd);
                update.text.push(d.fsd);
            } else {
                trNum[s]["sd"] = i++;
                let trDat = Object.assign({}, trInfo["sd"]);
                trDat["xaxis"] = "x" + p;
                trDat["yaxis"] = "y" + p;
                trDat["x"] = d.tsd;
                trDat["y"] = d.rsd;
                trDat["text"] = d.fsd;
                trDat["marker"] = {
                    size: 4,
                    color: d.csd,
                    symbol: d.ssd
                };
                newTr.push(trDat);
            }
        }
        //accessory information
        if(d.too.length || d.tda.length) {
            let p = 3*s + 3;    //out of orders and dup acks go in row 3
            if(layout["annotations"] === undefined && pdiv.layout.annotations === undefined) {
                    layout["annotations"] = [
                        ooda,
                        oohl,
                        oola,
                        Object.assign ({}, oosd, { x: col[s][0] }, {text: "out-of-order [side " + s + "]"})
                    ];
            } else if(trNum[s]["oo"] === undefined && trNum[s]["dp"] === undefined) {
                    if(layout["annotations"]) {
                        layout.annotations[layout.annotations.length] = Object.assign({},
                            oosd, {x: col[s][0] }, {text: "out-of-order [side " + s + "]"});
                    } else {
                        pdiv.layout.annotations[pdiv.layout.annotations.length] = Object.assign({},
                            oosd, {x: col[s][0] }, {text: "out-of-order [side " + s + "]"});
                    }
            }
            if(d.too.length) {  //out-of-order seq nos
                if(trNum[s]["oo"] !== undefined) {
                    indices.push( trNum[s]["oo"] );
                    update.x.push(d.too);
                    update.y.push(d.doo);
                    update["marker.color"].push(d.coo);
                    update["marker.symbol"].push(d.soo);
                    update.text.push(d.loo);
                } else {
                    trNum[s]["oo"] = i++;
                    let trDat = Object.assign({}, trInfo["oo"]);
                    trDat["xaxis"] = "x" + p;
                    trDat["yaxis"] = "y" + p;
                    trDat["x"] = d.too;
                    trDat["y"] = d.doo;
                    trDat["text"] = d.loo;
                    trDat["marker"] = {
                        size: 5,
                        color: d.coo,
                        symbol: d.soo
                    };
                    newTr.push(trDat);
                }
            }
            if(d.tda.length) {  //out-of-order seq nos
                if(trNum[s]["dp"] !== undefined) {
                    indices.push( trNum[s]["dp"] );
                    update.x.push(d.tda);
                    update.y.push(d.dda);
                    update["marker.color"].push(d.cda);
                    update["marker.symbol"].push(d.sda);
                    update.text.push(d.lda);
                } else {
                    trNum[s]["dp"] = i++;
                    let trDat = Object.assign({}, trInfo["dp"]);
                    trDat["xaxis"] = "x" + p;
                    trDat["yaxis"] = "y" + p;
                    trDat["x"] = d.tda;
                    trDat["y"] = d.dda;
                    trDat["text"] = d.lda;
                    trDat["marker"] = {
                        size: 5,
                        color: d.cda,
                        symbol: d.sda
                    };
                    newTr.push(trDat);
                }
            }
        } 
    }
    if(newTr.length)    //any new traces?
        Plotly.addTraces(pdiv, newTr);
    //make sure the time scale is always visible somwhere
    layout["xaxis.showticklabels"] = (trNum[0]["sd"] === undefined)? true : false;
    layout["xaxis4.showticklabels"] = (trNum[1]["sd"] === undefined)? true : false;
    Plotly.relayout(pdiv, layout);  //adjust ranges 
    if(indices.length)  //updates to existing traces?
        Plotly.extendTraces (pdiv, update, indices, 10000);
}

//Returns CP side of the flow source, passed as IP src address
//Only call this for a new source host. May have been seen as a dst
//  and had a sideInfo set for it
function setSide(s, d) {
    let sd = sideInfo[s];
    let dd = sideInfo[d];
    if (sd === undefined && dd === undefined) {
        //neither host has been set to a side - just put src host on side 1
        sideInfo[s] = {
            i: +1,
            w: +0
        };
        sideInfo[d] = {
            i: +0,
            w: +0
        };
        return +1;
    } else if (sd !== undefined && dd === undefined) {
        //src has been placed before as a dest
        let k = (sd.i > 0 ? +0 : +1);
        sideInfo[d] = {
            i: +k,
            w: +0
        };
        (sd.w)++;
        return sd.i;
    } else if (sd === undefined && dd !== undefined) {
        let k = (dd.i > 0 ? +0 : +1);
        sideInfo[s] = {
            i: +k,
            w: +0
        };
        (dd.w)++;
        return k;
    } else  {       //both s and d have been set to a side
        if (sd.i === dd.i) {
            console.log("setSide error: src %d and dst %d on same side", s, d);
            //check which one has most weight on its side
            if(sd.w >= dd.w) {
                let k = dd.i = (sd.i > 0 ? +0 : +1);
                dd.w = 0;
                if(hi[d]) {
                    hi[d].s = k;
                }
                (sd.w)++;
                return sd.i;
            } else {
                let k = sd.i = (dd.i > 0 ? +0 : +1);
                sd.w = 0;
                (dd.w)++;
                return k;
            }
        } else {
            (sd.w)++;
            (dd.w)++;
            return sd.i;
        }
    }
    console.log("setSide error: couldn't find a side for host " + s);
    process.exit();     //shouldn't get here
}

function cleanUp(now) {
    //remove old host values
    for (let k in hi) {
        if (now - hi[k].lstTm > maxIdle) {
            //release the id and delete the record
            let h = hi[k];
            hostId.push(h.id);
            (cpSide[h.s].srcCnt)--;
            delete sideInfo[k];
            delete hi[k];
        } 
    }
}

//add the new points to charts, clean up
function plotInterval(pdiv, lstTm) {
    //check if single sided or not
    let idleSide = [];
    for(let i=0; i<2;i++) { //check for an idle side
        if(cpSide[i].rpdMax === undefined && cpSide[i].rsdMax === undefined)
            idleSide.push(i);
    }
    if(singleSide === false && idleSide.length === 1) {
        //give the active side the entire width
        let layout = {};
        let p = 2*idleSide[0] + 1;
        let nm = p > 1 ?  "xaxis" + p + ".domain": "xaxis.domain";
        layout[nm] = [0, 0];
        p++;
        nm = "xaxis" + p + ".domain";
        layout[nm] = [0, 0];
        p = 2 * ((idleSide[0] + 1) % 2) +1;
        nm = p > 1 ?  "xaxis" + p + ".domain": "xaxis.domain";
        layout[nm] = [0, 1];
        p++;
        nm = "xaxis" + p + ".domain";
        layout[nm] = [0, 1];
        Plotly.relayout(pdiv, layout);
        singleSide = true;
    } else if(singleSide === true && idleSide.length === 0) {
        let layout = {};
        layout["xaxis.domain"] = col[0];
        layout["xaxis2.domain"] = col[0];
        layout["xaxis3.domain"] = col[0];
        layout["xaxis4.domain"] = col[1];
        layout["xaxis5.domain"] = col[1];
        layout["xaxis6.domain"] = col[1];
        Plotly.relayout(pdiv, layout);
        singleSide = false;
    }

    //lstTm in ms
    updateTraces(pdiv, lstTm);

    sideData = [];  //clear
    if(lstTm - lstCleanUp > cleanUpInterval) {
        cleanUp(lstTm);
        lstCleanUp = lstTm;
    }
}

//process each line into arrays that can be used in plotly traces
function processLine(line) {
    //extract fields from line
    let rec = line.split(/(\s+)/).filter(e=> {return e.trim().length > 0;});
    if (rec.length !== 8)
        return +0;             //not a good line

    //look for plottable fields
    let pd, sd, ds, dp;    
    pd = sd = ds = dp = +0;    
    if (rec[1] != "*")
        pd = 1000. * rec[1];       //pping rtd in msec
    if (rec[2] != "*")
        sd = 1000. * rec[2];       //seqno rtd in msec
    if (+rec[3] < 0 || +rec[3] > seqDiffIgnore)
        ds = +rec[3];              //seqno bytes diff from expected
    if (rec[4] != "-")  {
        dp = +rec[4];              //time between dup acks in sec
        if(dp <= dupDiffIgnore)    // this might better be a func of min
            dp = 0;
    }
    //ignore rtd measure artifacts
    if(pd > rtdBound)
        pd = +0;
    if(sd > rtdBound)
        sd = +0;
    if (!(pd + sd + ds + dp))
        return +0;                    //nothing to display

    //pull out host information
    const flow = rec[rec.length-1];  
    const hport = flow.split('+'); //host:port
    if(hport[0] === undefined || hport[1] === undefined)
        return;
    const src = ((hport[0]).split(":"))[0];
    const dst = ((hport[1]).split(":"))[0];
    if(src === undefined || dst === undefined)
        return +0;

    let tm = +rec[0] * 1000;        //line time in msec
    if (startTime === undefined) {  //init for this dataset
        lstCleanUp = startTime = tm;
    }

    //create/update hi entry
    let e = hi[src];
    if (e === undefined) {
        if(hostId.length === +0)
            return +0;         //no more ids
        let i = hostId.shift();
        let s = setSide(src, dst);
        if (cpSide[s].srcCnt === undefined)
            cpSide[s].srcCnt = 1;
        else
            (cpSide[s].srcCnt)++;
        hi[src] = {
            id: i,
            lstTm: tm,
            side: s,    //for subplot id
            bytes: +rec[6],
            pMin: +pd,
            sMin: +sd,
            color: hostColor[ i % hostColorCnt ],
            symbol: hostShape[ i % hostShapeCnt ]
        };
    } else {
        e.lstTm = tm;
        e.bytes = +rec[6];
        if (pd && e.pMin > pd)
            e.pMin = +pd;
        if (sd && e.sMin > sd)
            e.sMin = +sd;
    }

    //keep track of rtds and other data by side of capture point
    let s = hi[src].side;
    let d = sideData[s];    //temporary data storage until displayed
    if(d === undefined) {
        d = sideData[s] = {
            tpd: [],     //time val for each pping delay point
            rpd: [],     //rtd val for each pping delay point
            cpd: [],     //color info for pping delay point markers
            spd: [],     //symbol info for pping delay point markers
            fpd: [],     //flow name to go into text field for hover info

            tsd: [],     //time for each seqno difference point
            rsd: [],     //value for each seqno difference point
            csd: [],     //color info for pping delay point markers
            ssd: [],     //symbol info for pping delay point markers
            fsd: [],     //flow name to go into text field for hover info

            too: [],    //time of seqno difference
            doo: [],    //delay value to use on y-axis
            loo: [],    //hover label of bytes plus flow name this seqno diff
            soo: [],    //symbol, open circle or open square
            coo: [],    //color of host for this point
  
            tda: [],    //time of dup ack
            dda: [],    //delta - spacing between dup acks
            lda: [],    //hover label of bytes plus flow name this seqno diff
            sda: [],    //symbol of host for this dup ack
            cda: []    //color of host for this dup ack
        };
    }

    //add to displayable information
    let c = cpSide[s];      //persistent info across display time intervals
    let color = hi[src].color;
    let sym = hi[src].symbol;
    if(pd) {
        if(c.rpdCnt === undefined)
            c.rpdCnt = +0;
        c.rpdCnt++;
        d.tpd.push(+tm);
        d.rpd.push(+pd);
        d.cpd.push(color);
        d.spd.push(sym);
        d.fpd.push(flow);
    }
    if(sd) {
        if(c.rsdCnt === undefined)
            c.rsdCnt = +0;
        c.rsdCnt++;
/*
        if(c.rsdMin === undefined)
            c.rsdMin = new WinMin(2*stripTimeWidth, tm, sd);
        else
            c.rsdMin.update(tm, sd);
*/
        //ignore values that exceed 500 ms
        if(+sd < 500 && c.rsdMax === undefined)
            c.rsdMax = new WinMax(2*stripTimeWidth, tm, sd);
        else if(+sd < 500) 
            c.rsdMax.update(tm, sd);
        d.tsd.push(+tm);
        d.rsd.push(+sd);
        d.csd.push(color);
        d.ssd.push(sym);
        d.fsd.push(flow);
    }
    if(ds) {
        c.oo = true;
        d.too.push(+tm);
        d.loo.push(ds + ": " + flow);
        d.coo.push(color);
        if(+ds > 0) {
            d.doo.push(+1);
            d.soo.push("circle-open");
        } else {
            d.doo.push(-1);
            d.soo.push("square-open");
        }
    }
    if(dp) {
        c.da = true;
        d.tda.push(+tm);
        d.dda.push(+0);
        d.lda.push(dp + ": " + flow);
        d.sda.push(sym);
        d.cda.push(color);
    }

    return +1;
}

// exported functions

/* Input is served by nodejs program collectChunk.js. The main javascript
    in index.html calls this funtion when a new chunk arrives.
    -connmon should be using -m so input is in seconds
    -process each line in this interval's chunk into arrays of new points
    -plot the new points
    -return time of last sample line
*/

let plotDiv;

export function processInterval(chnk, updateSecs) {
    //split the chunk into an array of lines
    let lines = chnk.split(/^/m);
    let lt = (lines[lines.length-1].split(' '))[0];
    let lc = +0;
    for(let i=0; i<lines.length; i++) {
        lc += processLine(lines[i]);
    }
    if(lc)
        plotInterval(plotDiv, lt);
    return lt;
}

export function initVisualization(dname) {
    plotDiv = d3.select("#" + dname).node();
    initStripCharts(plotDiv);

    //data initialization
    //hostId.splice(0);       //makes sure it's empty
    for (let i=1; i<=maxHosts; i++)
        hostId.push(i);
    //persistent info about each side, max object defined later
    for(let i=0; i<2; i++)
        cpSide[i] = {
            srcCnt: +0,
            oo: false,
            da: false
        };
}

