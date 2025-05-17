
/* 
    group => vowel/consonant/symbol

    var jsonTreeMap = {
        children: [
            {
                alpha: 'consonant',
                children: [
                    {
                        alpha: 'f',
                        level: 1,
                        count: 10,
                        children: []
                    },
                    {
                        alpha: 'j',
                        level: 1,
                        count: 10,
                        children: []
                    }
                ]
            },
            {
                alpha: 'vowel',
                children: [
                    {
                        alpha: 'a',
                        level: 1,
                        count: 10,
                        children: []
                    }
                ]
            },
            {
                alpha: 'symbol',
                children: [
                    {
                        alpha: '?',
                        level: 1,
                        count: 1,
                        children: []
                    }
                ]
            }
        ]
    }
    
    jsonSankey = {
        nodes: [
            {
                name: 'a'
            },
            {
                name: 't'
            }
        ],
        links: [
            {
                source: 0,
                target: 1,
                value: 5
            }
        ]
    }
*/
var jsonSankey = {
    nodes: new Map(),
    links: []
};

var jsonTreeMap = {
    alpha: '',
    level: 0,
    count: 0,
    group: '',
    children: []
};

const color = d3.scaleOrdinal()
        .domain(['consonant', 'vowel', 'symbol'])
        .range([ '#CE93D8', '#80CBC4', '#EF9A9A']);

const vowelSet = new Set(['a', 'e', 'i', 'o', 'u', 'y']);
const consonantSet = new Set(['b', 'c', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'm','n', 'p', 'q', 'r', 's', 't', 'v', 'w', 'x', 'z']);
const symbolSet = new Set(['.',',','!','?',':',';']);

function getJsonTreeObject(alpha, level, group){
    return {
        alpha: alpha ? alpha : '',
        level: level ? level : 0,
        count: 0,
        group: group ? group : '',
        children: []
    }
}

function getJsonSankeyMapObject(nodes, links){
    return {
        nodes: nodes ? nodes : new Map(),
        links: links ? links : []
    }
}

function getJsonSankeyObject(nodes, links){
    return {
        nodes: nodes ? nodes : [],
        links: links ? links : []
    }
}

function getJsonSankeyLinkObject(source, target, value){
    return {
        source: source,
        target: target,
        value: value ? value : 0
    }
}

function parseTextToJsonTree(){

    /* 
        1. Check for the group of current element, create group if not present.
        2. Check for current element at level 1
            a. not present => add, increment count
            b. present => increment count
        3. 
    */

    jsonTreeMap = getJsonTreeObject();
    jsonSankey = getJsonSankeyMapObject();

    let text = document.getElementById('wordbox').innerHTML;
    let previousElement = '';

    for (let element of text) {

        if(!element || !element.trim()){
            previousElement = '';
            continue;
        }

        element = element.trim().toLowerCase();

        if(!vowelSet.has(element) && !consonantSet.has(element) && !symbolSet.has(element)){
            previousElement = '';
            continue;
        }

        //1
        let group = getElementGroup(element);

        if(!group){
            previousElement = '';
            continue;
        }

        let groupObj = findAndPushJsonObj(group, jsonTreeMap.children, 0, '');
        
        if(!jsonSankey.nodes.has(element)){
            jsonSankey.nodes.set(element, []);
        }
        
        //2 -- only for tree map chart json
        findAndPushJsonObj(element, groupObj.children, 1, group);

        //3 -- only for shanky chart json
        if(previousElement && previousElement !== element){
            findAndPushSankeyLink(previousElement, element);
        }

        previousElement = element;
    }

    drawTreeMap();
}

function findAndPushJsonObj(element, jsonArray, level, group){

    let jsonObj = jsonArray.find(obj => obj.alpha === element);

    if(!jsonObj){
        jsonObj = getJsonTreeObject(element, level, group);
        jsonArray.push(jsonObj);
    }

    jsonObj.count++;

    return jsonObj;
}

function getElementGroup(element){
    let group = 'consonant';
    if(vowelSet.has(element)){
        group = 'vowel';
    }else if(symbolSet.has(element)){
        group = 'symbol';
    }
    return group;
}

function findAndPushSankeyLink(previousElement, element){
    let link = jsonSankey.links.find(obj => (obj.source === previousElement && obj.target === element) || (obj.source === element && obj.target === previousElement));
    if(!link){
        link = getJsonSankeyLinkObject(previousElement, element);
        jsonSankey.links.push(link);
    }
    link.value++;
}

function drawTreeMap(){

    let width = 580;
    let height = 400;

    document.getElementById('treemap_svg').innerHTML = '';
    document.getElementById('sankey_svg').innerHTML = '';
    document.getElementById('flow_label').innerHTML = `Character flow for ...`;

    let svg = d3.select('#treemap_svg');

    let root = d3.hierarchy(jsonTreeMap)
        .sum(d => d.children && d.children.length > 0 ? 0 : d.count); //this condition was required to cover the whole area

    d3.treemap()
        .size([width, height])
        .padding(2)
        .paddingInner(3)
        (root);

    // create a tooltip
    let Tooltip = d3.select('#treemap_div')
        .append('div')
        .style('opacity', 0)
        .style('background-color', 'white')
        .style('border', 'solid')
        .style('border-width', '2px')
        .style('border-radius', '5px')
        .style('padding', '5px')
        .style('width', 'fit-content')
        .style('position', 'absolute');

    let mouseover = (e, d) => {
        Tooltip.style('opacity', 1)
            .style('stroke', 'black');

        highlight(d.data.alpha);
    }

    let mousemove = (event, d) => {
        Tooltip.html(`Character: ${d.data.alpha} <br/> Count: ${d.data.count}`)
            .style('left', (event.pageX+30) + 'px')
            .style('top', (event.pageY) + 'px');
    }

    let mouseleave = (e, d) => {
        Tooltip.style('opacity', 0)
            .style('stroke', 'none');

        dehighlight(d.data.alpha);
    }

    let onclick = (e, d) => {
        drawSankeyChart(d.data.alpha);
    }

    svg.selectAll('rect')
        .data(root.leaves())
        .enter()
        .append('rect')
            .attr('class', 'treeMapRect')
            .attr('x', d => d.x0)
            .attr('y', d => d.y0)
            .attr('width', d => d.x1 - d.x0)
            .attr('height', d => d.y1 - d.y0)
            .style('stroke', 'black')
            .style('fill', d => color(d.parent.data.alpha))
            .style('position', 'absolute')
            .style('cursor', 'pointer')
            .attr('value', d => d.data.alpha)
            .on('mouseover', mouseover)
            .on('mousemove', mousemove)
            .on('mouseleave', mouseleave)
            .on('click', onclick);

}

function drawSankeyChart(element){

    //filter selected alphabet

    document.getElementById('sankey_svg').innerHTML = '';
    document.getElementById('flow_label').innerHTML = `Character flow for '${element}'`;

    if(!jsonSankey.nodes.has(element)){
        return;
    }

    let linkArr = [];
    let nodeSet = new Set();
    nodeSet.add(element);

    jsonSankey.links.forEach(link => {
        if(link.source === element || link.target === element){
            nodeSet.add(link.source);
            nodeSet.add(link.target);
        }
    });

    let nodes = Array.from(nodeSet);

    jsonSankey.links.forEach(link => {
        if(link.source === element || link.target === element){
            linkArr.push(getJsonSankeyLinkObject(
                nodes.indexOf(link.source),
                nodes.indexOf(link.target),
                link.value
            ));
        }
    });

    let nodesObjectArr = nodes.map(n => new Object({
        node: nodes.indexOf(n), 
        name: n
    }));

    let jsonSankeyTemp = getJsonSankeyObject(nodesObjectArr, linkArr);

    let width = 580;
    let height = 400;

    // create a tooltip
    let Tooltip = d3.select('#sankey_div')
        .append('div')
        .style('opacity', 0)
        .style('background-color', 'white')
        .style('border', 'solid')
        .style('border-width', '2px')
        .style('border-radius', '5px')
        .style('padding', '5px')
        .style('width', 'fit-content')
        .style('position', 'absolute');

    let mouseover = (e, d) => {
        Tooltip.style('opacity', 1)
            .style('stroke', 'black');
        
        highlight(d.name);
    }

    let mousemove = (event, d) => {
        let text = '';
        if(d.sourceLinks && d.sourceLinks.length > 0 && d.targetLinks && d.targetLinks.length > 0){
            //middle
            text = `Character '${d.name}' appears ${d.value} times.` 
        }else if(d.sourceLinks && d.sourceLinks.length > 0){
            //left
            text = `Character '${d.name}' flows into character '${d.sourceLinks[0].target.name}' ${d.value} times.`
        }else{
            //right
            text = `Character '${d.targetLinks[0].source.name}' flows into character '${d.name}' ${d.value} times.`
        }
        Tooltip.html(text)
            .style('left', (event.pageX+30) + 'px')
            .style('top', (event.pageY) + 'px');
    }

    let mouseleave = (e, d) => {
        Tooltip.style('opacity', 0)
            .style('stroke', 'none');

        dehighlight(d.name);
    }

    let svg = d3.select('#sankey_svg')
        .append('g')
        .attr("transform", "translate(10,0)");
    
    let sankey = d3.sankey()
        .nodeWidth(36)
        .nodePadding(10)
        .size([width-50, height-20]);

    let graph = sankey(jsonSankeyTemp);

    svg.append('g')
        .attr("transform", "translate(20,10)")
        .attr("fill", "none")
        .attr("stroke", "#d3d3d3")
        .attr("stroke-opacity", 0.5)
        .selectAll('.link')
        .data(graph.links)
        .enter()
            .append('path')
            .attr('class', 'link')
            .attr('d', d3.sankeyLinkHorizontal())
            .attr("stroke-width", d => Math.max(1, d.width));  

    var node = svg.append('g')
        .attr("transform", "translate(20,10)")    
        .selectAll('.node')
        .data(graph.nodes)
        .enter()
        .append('g')
            .attr('class', 'node')
        .on('mouseover', mouseover)
        .on('mousemove', mousemove)
        .on('mouseleave', mouseleave);

    node.append('rect')
        .attr('class', 'sankeyRect')
        .attr('value', d => d.name)
        .attr('x', d => d.x0)
        .attr('y', d => d.y0)
        .attr('rx', 5)
        .attr('rxy', 5)
        .attr('height', d => d.y1 - d.y0)
        .attr('width', sankey.nodeWidth())
        .style('fill', d =>  color(getElementGroup(d.name)))
        .style('stroke', 'black');

    node.append('text')
        .attr('x', d => d.x0 - 15)
        .attr('y', d => (d.y1 + d.y0) / 2)
        .attr('dy', '0.35em')
        .attr('text-anchor', 'start')
        .text(d => d.name)
        .filter(d => d.x0 < width / 2);

    dehighlight(element);
    highlight(element);

}

function highlight(element){

    d3.selectAll('.treeMapRect, .sankeyRect')
        .filter(d => d.name === element || (d.data && d.data.alpha === element))
        .style('stroke-width', 3)
        .style('stroke', '#3E2723');

    let wordbox = document.getElementById('wordbox');
    let regExp = new RegExp(escapeSpecialChars(element), "g");
    wordbox.innerHTML = wordbox.innerHTML.replace(regExp, `<mark class="highlighted-mark">${element}</mark>`);
}

function dehighlight(element){

    d3.selectAll('.treeMapRect, .sankeyRect')
        .filter(d => d.name === element || (d.data && d.data.alpha === element))
        .style('stroke-width', 1)
        .style('stroke', 'black');

    let wordbox = document.getElementById('wordbox');
    let regExp = new RegExp(escapeSpecialChars(`<mark class="highlighted-mark">${element}</mark>`), "g");
    wordbox.innerHTML = wordbox.innerHTML.replace(regExp, element);
}

function escapeSpecialChars(string) {
    return string.replace(/[.,!?:;]/g, '\\$&');
}
