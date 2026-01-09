// 省市小区街道办事处数据
const communityData = {
    "北京市": {
        "北京市": {
            "东城区": {
                "天坛街道": [
                    { name: "天坛东里小区", streetOffice: "天坛街道办事处" },
                    { name: "天坛西里小区", streetOffice: "天坛街道办事处" },
                    { name: "天坛南里小区", streetOffice: "天坛街道办事处" }
                ],
                "东华门街道": [
                    { name: "东华门小区", streetOffice: "东华门街道办事处" },
                    { name: "王府井小区", streetOffice: "东华门街道办事处" }
                ]
            },
            "西城区": {
                "西长安街街道": [
                    { name: "西单小区", streetOffice: "西长安街街道办事处" },
                    { name: "中南海小区", streetOffice: "西长安街街道办事处" }
                ],
                "金融街街道": [
                    { name: "金融街小区", streetOffice: "金融街街道办事处" },
                    { name: "复兴门小区", streetOffice: "金融街街道办事处" }
                ]
            },
            "朝阳区": {
                "三里屯街道": [
                    { name: "三里屯小区", streetOffice: "三里屯街道办事处" },
                    { name: "工体小区", streetOffice: "三里屯街道办事处" }
                ],
                "望京街道": [
                    { name: "望京西园", streetOffice: "望京街道办事处" },
                    { name: "望京东园", streetOffice: "望京街道办事处" },
                    { name: "望京新城", streetOffice: "望京街道办事处" }
                ]
            },
            "海淀区": {
                "中关村街道": [
                    { name: "中关村小区", streetOffice: "中关村街道办事处" },
                    { name: "中关村西区", streetOffice: "中关村街道办事处" }
                ],
                "学院路街道": [
                    { name: "学院路小区", streetOffice: "学院路街道办事处" },
                    { name: "五道口小区", streetOffice: "学院路街道办事处" }
                ]
            }
        }
    },
    "上海市": {
        "上海市": {
            "黄浦区": {
                "外滩街道": [
                    { name: "外滩小区", streetOffice: "外滩街道办事处" },
                    { name: "南京东路小区", streetOffice: "外滩街道办事处" }
                ],
                "南京东路街道": [
                    { name: "人民广场小区", streetOffice: "南京东路街道办事处" },
                    { name: "南京路小区", streetOffice: "南京东路街道办事处" }
                ]
            },
            "徐汇区": {
                "徐家汇街道": [
                    { name: "徐家汇小区", streetOffice: "徐家汇街道办事处" },
                    { name: "衡山路小区", streetOffice: "徐家汇街道办事处" }
                ],
                "田林街道": [
                    { name: "田林新村", streetOffice: "田林街道办事处" },
                    { name: "田林路小区", streetOffice: "田林街道办事处" }
                ]
            },
            "浦东新区": {
                "陆家嘴街道": [
                    { name: "陆家嘴花园", streetOffice: "陆家嘴街道办事处" },
                    { name: "世纪大道小区", streetOffice: "陆家嘴街道办事处" }
                ],
                "张江镇": [
                    { name: "张江高科技园区", streetOffice: "张江镇人民政府" },
                    { name: "张江路小区", streetOffice: "张江镇人民政府" }
                ]
            }
        }
    },
    "广东省": {
        "广州市": {
            "天河区": {
                "天河南街道": [
                    { name: "天河南小区", streetOffice: "天河南街道办事处" },
                    { name: "体育西路小区", streetOffice: "天河南街道办事处" }
                ],
                "石牌街道": [
                    { name: "石牌村", streetOffice: "石牌街道办事处" },
                    { name: "岗顶小区", streetOffice: "石牌街道办事处" }
                ]
            },
            "越秀区": {
                "北京街道": [
                    { name: "北京路小区", streetOffice: "北京街道办事处" },
                    { name: "中山路小区", streetOffice: "北京街道办事处" }
                ]
            }
        },
        "深圳市": {
            "南山区": {
                "粤海街道": [
                    { name: "科技园小区", streetOffice: "粤海街道办事处" },
                    { name: "深圳湾小区", streetOffice: "粤海街道办事处" }
                ],
                "蛇口街道": [
                    { name: "蛇口花园", streetOffice: "蛇口街道办事处" },
                    { name: "海上世界小区", streetOffice: "蛇口街道办事处" }
                ]
            },
            "福田区": {
                "福田街道": [
                    { name: "福田中心区", streetOffice: "福田街道办事处" },
                    { name: "CBD小区", streetOffice: "福田街道办事处" }
                ]
            }
        }
    },
    "浙江省": {
        "杭州市": {
            "西湖区": {
                "文新街道": [
                    { name: "文新小区", streetOffice: "文新街道办事处" },
                    { name: "文三路小区", streetOffice: "文新街道办事处" }
                ],
                "北山街道": [
                    { name: "北山路小区", streetOffice: "北山街道办事处" },
                    { name: "保俶路小区", streetOffice: "北山街道办事处" }
                ]
            },
            "上城区": {
                "湖滨街道": [
                    { name: "湖滨小区", streetOffice: "湖滨街道办事处" },
                    { name: "西湖边小区", streetOffice: "湖滨街道办事处" }
                ]
            }
        }
    },
    "江苏省": {
        "南京市": {
            "鼓楼区": {
                "湖南路街道": [
                    { name: "湖南路小区", streetOffice: "湖南路街道办事处" },
                    { name: "中山北路小区", streetOffice: "湖南路街道办事处" }
                ]
            },
            "玄武区": {
                "新街口街道": [
                    { name: "新街口小区", streetOffice: "新街口街道办事处" },
                    { name: "中山东路小区", streetOffice: "新街口街道办事处" }
                ]
            }
        }
    }
};

// 获取所有省份列表
function getProvinces() {
    return Object.keys(communityData);
}

// 根据省份获取城市列表
function getCities(province) {
    if (!province || !communityData[province]) return [];
    return Object.keys(communityData[province]);
}

// 根据省份和城市获取区县列表
function getDistricts(province, city) {
    if (!province || !city || !communityData[province] || !communityData[province][city]) return [];
    return Object.keys(communityData[province][city]);
}

// 根据省份、城市、区县获取街道列表
function getStreets(province, city, district) {
    if (!province || !city || !district || 
        !communityData[province] || 
        !communityData[province][city] || 
        !communityData[province][city][district]) return [];
    return Object.keys(communityData[province][city][district]);
}

// 根据省份、城市、区县获取所有小区
function getCommunities(province, city, district) {
    if (!province || !city || !district || 
        !communityData[province] || 
        !communityData[province][city] || 
        !communityData[province][city][district]) return [];
    
    const streets = communityData[province][city][district];
    const allCommunities = [];
    
    for (const street in streets) {
        allCommunities.push(...streets[street]);
    }
    
    return allCommunities;
}

// 搜索小区
function searchCommunities(province, city, district, keyword) {
    const communities = getCommunities(province, city, district);
    if (!keyword) return communities;
    
    const lowerKeyword = keyword.toLowerCase();
    return communities.filter(community => 
        community.name.toLowerCase().includes(lowerKeyword)
    );
}
