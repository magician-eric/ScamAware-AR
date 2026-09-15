// Centralized police-organization dataset: 縣市 -> 分局(或警察所) -> 派出所/分駐所.
// This file is the ONE source of truth for division and station names. The
// 警察局 (department) name is NOT duplicated here - it stays owned by
// locationDataset.js, which every consumer already reads for county-level
// agency data.
//
// Provenance: transcribed from the public 中華民國警察分局列表 tables on
// zh.wikipedia.org (the same seed source recorded in
// docs/location-mapping/police-precinct-station-seed.csv). Like the rest of
// the location seed data it is public reference data, not yet officially
// verified against each agency's own site - see PoliceOrganizationResolver.js
// for how unverified entries are handled.
//
// Deliberate omissions, so a re-import does not "helpfully" add them back:
//   * 檢查所 (mountain/forest checkpoints) - not report-taking units.
//   * Planned or already-abolished stations (e.g. 彰化 萬年派出所(預定),
//     中華路派出所, which was merged away in 2021).
//   * 臺中第三分局 合作派出所 is listed under its post-2023 name 東信派出所.
//
// `type` values: police_station (派出所), substation (分駐所),
// post (駐在所 - staffed, but not a report-taking front desk),
// and, for divisions, police_office (連江縣's 警察所 - the one county with
// no 分局 at all; its units are modelled exactly as the agency names them
// rather than renamed to fit the schema).
export const POLICE_ORGANIZATION = [
  {
    "county": "臺北市",
    "divisions": [
      {
        "id": "臺北市-大同分局",
        "name": "大同分局",
        "type": "division",
        "districts": [
          "大同區"
        ],
        "stations": [
          {
            "name": "寧夏路派出所",
            "type": "police_station"
          },
          {
            "name": "延平派出所",
            "type": "police_station"
          },
          {
            "name": "建成派出所",
            "type": "police_station"
          },
          {
            "name": "民族路派出所",
            "type": "police_station"
          },
          {
            "name": "民生西路派出所",
            "type": "police_station"
          },
          {
            "name": "重慶北路派出所",
            "type": "police_station"
          }
        ]
      },
      {
        "id": "臺北市-萬華分局",
        "name": "萬華分局",
        "type": "division",
        "districts": [
          "萬華區"
        ],
        "stations": [
          {
            "name": "西門町派出所",
            "type": "police_station"
          },
          {
            "name": "龍山派出所",
            "type": "police_station"
          },
          {
            "name": "康定路派出所",
            "type": "police_station"
          },
          {
            "name": "東園街派出所",
            "type": "police_station"
          },
          {
            "name": "西園路派出所",
            "type": "police_station"
          },
          {
            "name": "大理街派出所",
            "type": "police_station"
          },
          {
            "name": "華江派出所",
            "type": "police_station"
          },
          {
            "name": "莒光派出所",
            "type": "police_station"
          },
          {
            "name": "青年路派出所",
            "type": "police_station"
          }
        ]
      },
      {
        "id": "臺北市-中山分局",
        "name": "中山分局",
        "type": "division",
        "districts": [
          "中山區"
        ],
        "stations": [
          {
            "name": "中山一派出所",
            "type": "police_station"
          },
          {
            "name": "中山二派出所",
            "type": "police_station"
          },
          {
            "name": "圓山派出所",
            "type": "police_station"
          },
          {
            "name": "長春路派出所",
            "type": "police_station"
          },
          {
            "name": "長安東路派出所",
            "type": "police_station"
          },
          {
            "name": "民權一派出所",
            "type": "police_station"
          },
          {
            "name": "建國派出所",
            "type": "police_station"
          },
          {
            "name": "大直派出所",
            "type": "police_station"
          }
        ]
      },
      {
        "id": "臺北市-大安分局",
        "name": "大安分局",
        "type": "division",
        "districts": [
          "大安區"
        ],
        "stations": [
          {
            "name": "和平東路派出所",
            "type": "police_station"
          },
          {
            "name": "安和路派出所",
            "type": "police_station"
          },
          {
            "name": "敦化南路派出所",
            "type": "police_station"
          },
          {
            "name": "新生南路派出所",
            "type": "police_station"
          },
          {
            "name": "瑞安街派出所",
            "type": "police_station"
          },
          {
            "name": "羅斯福路派出所",
            "type": "police_station"
          },
          {
            "name": "臥龍街派出所",
            "type": "police_station"
          }
        ]
      },
      {
        "id": "臺北市-中正第一分局",
        "name": "中正第一分局",
        "type": "division",
        "districts": [
          "中正區"
        ],
        "stations": [
          {
            "name": "博愛路派出所",
            "type": "police_station"
          },
          {
            "name": "忠孝西路派出所",
            "type": "police_station"
          },
          {
            "name": "忠孝東路派出所",
            "type": "police_station"
          },
          {
            "name": "介壽路派出所",
            "type": "police_station"
          },
          {
            "name": "仁愛路派出所",
            "type": "police_station"
          }
        ]
      },
      {
        "id": "臺北市-松山分局",
        "name": "松山分局",
        "type": "division",
        "districts": [
          "松山區"
        ],
        "stations": [
          {
            "name": "三民派出所",
            "type": "police_station"
          },
          {
            "name": "中崙派出所",
            "type": "police_station"
          },
          {
            "name": "東社派出所",
            "type": "police_station"
          },
          {
            "name": "松山派出所",
            "type": "police_station"
          },
          {
            "name": "民有派出所",
            "type": "police_station"
          }
        ]
      },
      {
        "id": "臺北市-中正第二分局",
        "name": "中正第二分局",
        "type": "division",
        "districts": [
          "中正區"
        ],
        "stations": [
          {
            "name": "廈門街派出所",
            "type": "police_station"
          },
          {
            "name": "思源街派出所",
            "type": "police_station"
          },
          {
            "name": "泉州街派出所",
            "type": "police_station"
          },
          {
            "name": "南昌路派出所",
            "type": "police_station"
          },
          {
            "name": "南海路派出所",
            "type": "police_station"
          }
        ]
      },
      {
        "id": "臺北市-文山第一分局",
        "name": "文山第一分局",
        "type": "division",
        "districts": [
          "文山區"
        ],
        "stations": [
          {
            "name": "木柵派出所",
            "type": "police_station"
          },
          {
            "name": "木新派出所",
            "type": "police_station"
          },
          {
            "name": "復興派出所",
            "type": "police_station"
          },
          {
            "name": "萬芳派出所",
            "type": "police_station"
          },
          {
            "name": "指南派出所",
            "type": "police_station"
          }
        ]
      },
      {
        "id": "臺北市-文山第二分局",
        "name": "文山第二分局",
        "type": "division",
        "districts": [
          "文山區"
        ],
        "stations": [
          {
            "name": "景美派出所",
            "type": "police_station"
          },
          {
            "name": "興隆派出所",
            "type": "police_station"
          },
          {
            "name": "萬盛派出所",
            "type": "police_station"
          }
        ]
      },
      {
        "id": "臺北市-內湖分局",
        "name": "內湖分局",
        "type": "division",
        "districts": [
          "內湖區"
        ],
        "stations": [
          {
            "name": "內湖派出所",
            "type": "police_station"
          },
          {
            "name": "潭美派出所",
            "type": "police_station"
          },
          {
            "name": "西湖派出所",
            "type": "police_station"
          },
          {
            "name": "大湖派出所",
            "type": "police_station"
          },
          {
            "name": "文德派出所",
            "type": "police_station"
          },
          {
            "name": "東湖派出所",
            "type": "police_station"
          },
          {
            "name": "康樂派出所",
            "type": "police_station"
          },
          {
            "name": "康寧派出所",
            "type": "police_station"
          },
          {
            "name": "港墘派出所",
            "type": "police_station"
          }
        ]
      },
      {
        "id": "臺北市-南港分局",
        "name": "南港分局",
        "type": "division",
        "districts": [
          "南港區"
        ],
        "stations": [
          {
            "name": "南港派出所",
            "type": "police_station"
          },
          {
            "name": "同德派出所",
            "type": "police_station"
          },
          {
            "name": "舊莊派出所",
            "type": "police_station"
          },
          {
            "name": "玉成派出所",
            "type": "police_station"
          }
        ]
      },
      {
        "id": "臺北市-信義分局",
        "name": "信義分局",
        "type": "division",
        "districts": [
          "信義區"
        ],
        "stations": [
          {
            "name": "三張犁派出所",
            "type": "police_station"
          },
          {
            "name": "五分埔派出所",
            "type": "police_station"
          },
          {
            "name": "六張犁派出所",
            "type": "police_station"
          },
          {
            "name": "吳興街派出所",
            "type": "police_station"
          },
          {
            "name": "福德街派出所",
            "type": "police_station"
          }
        ]
      },
      {
        "id": "臺北市-士林分局",
        "name": "士林分局",
        "type": "division",
        "districts": [
          "士林區"
        ],
        "stations": [
          {
            "name": "文林派出所",
            "type": "police_station"
          },
          {
            "name": "社子派出所",
            "type": "police_station"
          },
          {
            "name": "後港派出所",
            "type": "police_station"
          },
          {
            "name": "蘭雅派出所",
            "type": "police_station"
          },
          {
            "name": "芝山岩派出所",
            "type": "police_station"
          },
          {
            "name": "天母派出所",
            "type": "police_station"
          },
          {
            "name": "永福派出所",
            "type": "police_station"
          },
          {
            "name": "山仔后派出所",
            "type": "police_station"
          },
          {
            "name": "溪山派出所",
            "type": "police_station"
          },
          {
            "name": "翠山派出所",
            "type": "police_station"
          }
        ]
      },
      {
        "id": "臺北市-北投分局",
        "name": "北投分局",
        "type": "division",
        "districts": [
          "北投區"
        ],
        "stations": [
          {
            "name": "長安派出所",
            "type": "police_station"
          },
          {
            "name": "石牌派出所",
            "type": "police_station"
          },
          {
            "name": "永明派出所",
            "type": "police_station"
          },
          {
            "name": "光明派出所",
            "type": "police_station"
          },
          {
            "name": "大屯派出所",
            "type": "police_station"
          },
          {
            "name": "關渡派出所",
            "type": "police_station"
          },
          {
            "name": "奇岩派出所",
            "type": "police_station"
          },
          {
            "name": "竹子湖派出所",
            "type": "police_station"
          },
          {
            "name": "公園派出所",
            "type": "police_station"
          }
        ]
      }
    ]
  },
  {
    "county": "新北市",
    "divisions": [
      {
        "id": "新北市-瑞芳分局",
        "name": "瑞芳分局",
        "type": "division",
        "districts": [
          "瑞芳區",
          "貢寮區",
          "平溪區",
          "雙溪區"
        ],
        "stations": [
          {
            "name": "瑞芳派出所",
            "type": "police_station"
          },
          {
            "name": "大寮派出所",
            "type": "police_station"
          },
          {
            "name": "猴硐派出所",
            "type": "police_station"
          },
          {
            "name": "鼻頭派出所",
            "type": "police_station"
          },
          {
            "name": "瑞濱派出所",
            "type": "police_station"
          },
          {
            "name": "九份派出所",
            "type": "police_station"
          },
          {
            "name": "金瓜石派出所",
            "type": "police_station"
          },
          {
            "name": "水湳洞派出所",
            "type": "police_station"
          },
          {
            "name": "四腳亭派出所",
            "type": "police_station"
          },
          {
            "name": "貢寮分駐所",
            "type": "substation"
          },
          {
            "name": "和美派出所",
            "type": "police_station"
          },
          {
            "name": "澳底派出所",
            "type": "police_station"
          },
          {
            "name": "卯澳派出所",
            "type": "police_station"
          },
          {
            "name": "吉林派出所",
            "type": "police_station"
          },
          {
            "name": "福隆派出所",
            "type": "police_station"
          },
          {
            "name": "平溪分駐所",
            "type": "substation"
          },
          {
            "name": "十分派出所",
            "type": "police_station"
          },
          {
            "name": "東勢格派出所",
            "type": "police_station"
          },
          {
            "name": "雙溪分駐所",
            "type": "substation"
          },
          {
            "name": "柑腳派出所",
            "type": "police_station"
          },
          {
            "name": "牡丹派出所",
            "type": "police_station"
          },
          {
            "name": "太平派出所",
            "type": "police_station"
          },
          {
            "name": "平林派出所",
            "type": "police_station"
          }
        ]
      },
      {
        "id": "新北市-汐止分局",
        "name": "汐止分局",
        "type": "division",
        "districts": [
          "汐止區"
        ],
        "stations": [
          {
            "name": "汐止派出所",
            "type": "police_station"
          },
          {
            "name": "長青派出所",
            "type": "police_station"
          },
          {
            "name": "東山派出所",
            "type": "police_station"
          },
          {
            "name": "社後派出所",
            "type": "police_station"
          },
          {
            "name": "長安派出所",
            "type": "police_station"
          },
          {
            "name": "烘內派出所",
            "type": "police_station"
          },
          {
            "name": "橫科派出所",
            "type": "police_station"
          }
        ]
      },
      {
        "id": "新北市-新店分局",
        "name": "新店分局",
        "type": "division",
        "districts": [
          "新店區",
          "深坑區",
          "石碇區",
          "坪林區",
          "烏來區"
        ],
        "stations": [
          {
            "name": "江陵派出所",
            "type": "police_station"
          },
          {
            "name": "安康派出所",
            "type": "police_station"
          },
          {
            "name": "安和派出所",
            "type": "police_station"
          },
          {
            "name": "直潭派出所",
            "type": "police_station"
          },
          {
            "name": "青潭派出所",
            "type": "police_station"
          },
          {
            "name": "頂城派出所",
            "type": "police_station"
          },
          {
            "name": "屈尺派出所",
            "type": "police_station"
          },
          {
            "name": "碧潭派出所",
            "type": "police_station"
          },
          {
            "name": "龜山派出所",
            "type": "police_station"
          },
          {
            "name": "雙城派出所",
            "type": "police_station"
          },
          {
            "name": "深坑分駐所",
            "type": "substation"
          },
          {
            "name": "石碇分駐所",
            "type": "substation"
          },
          {
            "name": "中民派出所",
            "type": "police_station"
          },
          {
            "name": "楓子林派出所",
            "type": "police_station"
          },
          {
            "name": "碧山派出所",
            "type": "police_station"
          },
          {
            "name": "豐田派出所",
            "type": "police_station"
          },
          {
            "name": "坪林分駐所",
            "type": "substation"
          },
          {
            "name": "漁光派出所",
            "type": "police_station"
          },
          {
            "name": "石嘈派出所",
            "type": "police_station"
          },
          {
            "name": "闊瀨派出所",
            "type": "police_station"
          },
          {
            "name": "金溪派出所",
            "type": "police_station"
          },
          {
            "name": "烏來分駐所",
            "type": "substation"
          },
          {
            "name": "忠治派出所",
            "type": "police_station"
          },
          {
            "name": "孝義派出所",
            "type": "police_station"
          },
          {
            "name": "信賢派出所",
            "type": "police_station"
          },
          {
            "name": "福山派出所",
            "type": "police_station"
          }
        ]
      },
      {
        "id": "新北市-淡水分局",
        "name": "淡水分局",
        "type": "division",
        "districts": [
          "淡水區",
          "三芝區"
        ],
        "stations": [
          {
            "name": "中山路派出所",
            "type": "police_station"
          },
          {
            "name": "中正路派出所",
            "type": "police_station"
          },
          {
            "name": "水碓派出所",
            "type": "police_station"
          },
          {
            "name": "竹圍派出所",
            "type": "police_station"
          },
          {
            "name": "賢孝派出所",
            "type": "police_station"
          },
          {
            "name": "興仁派出所",
            "type": "police_station"
          },
          {
            "name": "水源派出所",
            "type": "police_station"
          },
          {
            "name": "三芝分駐所",
            "type": "substation"
          },
          {
            "name": "後厝派出所",
            "type": "police_station"
          },
          {
            "name": "興華派出所",
            "type": "police_station"
          }
        ]
      },
      {
        "id": "新北市-三峽分局",
        "name": "三峽分局",
        "type": "division",
        "districts": [
          "三峽區",
          "鶯歌區"
        ],
        "stations": [
          {
            "name": "三峽派出所",
            "type": "police_station"
          },
          {
            "name": "五寮派出所",
            "type": "police_station"
          },
          {
            "name": "吉埔派出所",
            "type": "police_station"
          },
          {
            "name": "圳頭派出所",
            "type": "police_station"
          },
          {
            "name": "成福派出所",
            "type": "police_station"
          },
          {
            "name": "插角派出所",
            "type": "police_station"
          },
          {
            "name": "橫溪派出所",
            "type": "police_station"
          },
          {
            "name": "北大派出所",
            "type": "police_station"
          },
          {
            "name": "鶯歌分駐所",
            "type": "substation"
          },
          {
            "name": "鳳鳴派出所",
            "type": "police_station"
          },
          {
            "name": "湖山派出所",
            "type": "police_station"
          },
          {
            "name": "二橋派出所",
            "type": "police_station"
          }
        ]
      },
      {
        "id": "新北市-新莊分局",
        "name": "新莊分局",
        "type": "division",
        "districts": [
          "新莊區"
        ],
        "stations": [
          {
            "name": "新莊派出所",
            "type": "police_station"
          },
          {
            "name": "福營派出所",
            "type": "police_station"
          },
          {
            "name": "中港派出所",
            "type": "police_station"
          },
          {
            "name": "中平派出所",
            "type": "police_station"
          },
          {
            "name": "頭前派出所",
            "type": "police_station"
          },
          {
            "name": "光華派出所",
            "type": "police_station"
          },
          {
            "name": "丹鳳派出所",
            "type": "police_station"
          },
          {
            "name": "五工派出所",
            "type": "police_station"
          },
          {
            "name": "新樹派出所",
            "type": "police_station"
          },
          {
            "name": "昌平派出所",
            "type": "police_station"
          }
        ]
      },
      {
        "id": "新北市-板橋分局",
        "name": "板橋分局",
        "type": "division",
        "districts": [
          "板橋區"
        ],
        "stations": [
          {
            "name": "板橋派出所",
            "type": "police_station"
          },
          {
            "name": "沙崙派出所",
            "type": "police_station"
          },
          {
            "name": "後埔派出所",
            "type": "police_station"
          },
          {
            "name": "信義派出所",
            "type": "police_station"
          },
          {
            "name": "大觀派出所",
            "type": "police_station"
          }
        ]
      },
      {
        "id": "新北市-海山分局",
        "name": "海山分局",
        "type": "division",
        "districts": [
          "板橋區"
        ],
        "stations": [
          {
            "name": "海山派出所",
            "type": "police_station"
          },
          {
            "name": "埔墘派出所",
            "type": "police_station"
          },
          {
            "name": "新海派出所",
            "type": "police_station"
          },
          {
            "name": "江翠派出所",
            "type": "police_station"
          },
          {
            "name": "文聖派出所",
            "type": "police_station"
          }
        ]
      },
      {
        "id": "新北市-三重分局",
        "name": "三重分局",
        "type": "division",
        "districts": [
          "三重區"
        ],
        "stations": [
          {
            "name": "三重派出所",
            "type": "police_station"
          },
          {
            "name": "大同派出所",
            "type": "police_station"
          },
          {
            "name": "光明派出所",
            "type": "police_station"
          },
          {
            "name": "慈福派出所",
            "type": "police_station"
          },
          {
            "name": "永福派出所",
            "type": "police_station"
          },
          {
            "name": "二重派出所",
            "type": "police_station"
          },
          {
            "name": "中興橋派出所",
            "type": "police_station"
          },
          {
            "name": "大有派出所",
            "type": "police_station"
          },
          {
            "name": "厚德派出所",
            "type": "police_station"
          },
          {
            "name": "長泰派出所",
            "type": "police_station"
          },
          {
            "name": "重陽派出所",
            "type": "police_station"
          }
        ]
      },
      {
        "id": "新北市-永和分局",
        "name": "永和分局",
        "type": "division",
        "districts": [
          "永和區"
        ],
        "stations": [
          {
            "name": "永和派出所",
            "type": "police_station"
          },
          {
            "name": "秀朗派出所",
            "type": "police_station"
          },
          {
            "name": "得和派出所",
            "type": "police_station"
          },
          {
            "name": "新生派出所",
            "type": "police_station"
          },
          {
            "name": "中正橋派出所",
            "type": "police_station"
          }
        ]
      },
      {
        "id": "新北市-中和分局",
        "name": "中和分局",
        "type": "division",
        "districts": [
          "中和區"
        ],
        "stations": [
          {
            "name": "中和派出所",
            "type": "police_station"
          },
          {
            "name": "秀山派出所",
            "type": "police_station"
          },
          {
            "name": "南勢派出所",
            "type": "police_station"
          },
          {
            "name": "安平派出所",
            "type": "police_station"
          },
          {
            "name": "景安派出所",
            "type": "police_station"
          },
          {
            "name": "員山派出所",
            "type": "police_station"
          },
          {
            "name": "國光派出所",
            "type": "police_station"
          },
          {
            "name": "錦和派出所",
            "type": "police_station"
          },
          {
            "name": "積穗派出所",
            "type": "police_station"
          },
          {
            "name": "中原派出所",
            "type": "police_station"
          }
        ]
      },
      {
        "id": "新北市-樹林分局",
        "name": "樹林分局",
        "type": "division",
        "districts": [
          "樹林區"
        ],
        "stations": [
          {
            "name": "樹林派出所",
            "type": "police_station"
          },
          {
            "name": "三多派出所",
            "type": "police_station"
          },
          {
            "name": "山佳派出所",
            "type": "police_station"
          },
          {
            "name": "柑園派出所",
            "type": "police_station"
          },
          {
            "name": "彭厝派出所",
            "type": "police_station"
          }
        ]
      },
      {
        "id": "新北市-蘆洲分局",
        "name": "蘆洲分局",
        "type": "division",
        "districts": [
          "蘆洲區",
          "五股區",
          "八里區"
        ],
        "stations": [
          {
            "name": "蘆洲派出所",
            "type": "police_station"
          },
          {
            "name": "三民派出所",
            "type": "police_station"
          },
          {
            "name": "延平派出所",
            "type": "police_station"
          },
          {
            "name": "集賢派出所",
            "type": "police_station"
          },
          {
            "name": "五股分駐所",
            "type": "substation"
          },
          {
            "name": "成州派出所",
            "type": "police_station"
          },
          {
            "name": "德音派出所",
            "type": "police_station"
          },
          {
            "name": "更寮派出所",
            "type": "police_station"
          },
          {
            "name": "八里分駐所",
            "type": "substation"
          },
          {
            "name": "龍源派出所",
            "type": "police_station"
          }
        ]
      },
      {
        "id": "新北市-金山分局",
        "name": "金山分局",
        "type": "division",
        "districts": [
          "金山區",
          "萬里區",
          "石門區"
        ],
        "stations": [
          {
            "name": "金山派出所",
            "type": "police_station"
          },
          {
            "name": "中角派出所",
            "type": "police_station"
          },
          {
            "name": "重光派出所",
            "type": "police_station"
          },
          {
            "name": "萬里分駐所",
            "type": "substation"
          },
          {
            "name": "崁腳派出所",
            "type": "police_station"
          },
          {
            "name": "野柳派出所",
            "type": "police_station"
          },
          {
            "name": "大鵬派出所",
            "type": "police_station"
          },
          {
            "name": "石門分駐所",
            "type": "substation"
          },
          {
            "name": "乾華派出所",
            "type": "police_station"
          },
          {
            "name": "老梅派出所",
            "type": "police_station"
          }
        ]
      },
      {
        "id": "新北市-土城分局",
        "name": "土城分局",
        "type": "division",
        "districts": [
          "土城區"
        ],
        "stations": [
          {
            "name": "土城派出所",
            "type": "police_station"
          },
          {
            "name": "清水派出所",
            "type": "police_station"
          },
          {
            "name": "頂埔派出所",
            "type": "police_station"
          },
          {
            "name": "廣福派出所",
            "type": "police_station"
          },
          {
            "name": "金城派出所",
            "type": "police_station"
          }
        ]
      },
      {
        "id": "新北市-林口分局",
        "name": "林口分局",
        "type": "division",
        "districts": [
          "林口區",
          "泰山區"
        ],
        "stations": [
          {
            "name": "林口派出所",
            "type": "police_station"
          },
          {
            "name": "文化派出所",
            "type": "police_station"
          },
          {
            "name": "文林派出所",
            "type": "police_station"
          },
          {
            "name": "瑞平派出所",
            "type": "police_station"
          },
          {
            "name": "下福派出所",
            "type": "police_station"
          },
          {
            "name": "忠孝派出所",
            "type": "police_station"
          },
          {
            "name": "泰山分駐所",
            "type": "substation"
          },
          {
            "name": "明志派出所",
            "type": "police_station"
          }
        ]
      }
    ]
  },
  {
    "county": "桃園市",
    "divisions": [
      {
        "id": "桃園市-桃園分局",
        "name": "桃園分局",
        "type": "division",
        "districts": [
          "桃園區"
        ],
        "stations": [
          {
            "name": "景福派出所",
            "type": "police_station"
          },
          {
            "name": "武陵派出所",
            "type": "police_station"
          },
          {
            "name": "同安派出所",
            "type": "police_station"
          },
          {
            "name": "青溪派出所",
            "type": "police_station"
          },
          {
            "name": "埔子派出所",
            "type": "police_station"
          },
          {
            "name": "中路派出所",
            "type": "police_station"
          },
          {
            "name": "大樹派出所",
            "type": "police_station"
          },
          {
            "name": "龍安派出所",
            "type": "police_station"
          },
          {
            "name": "小檜溪派出所",
            "type": "police_station"
          }
        ]
      },
      {
        "id": "桃園市-大溪分局",
        "name": "大溪分局",
        "type": "division",
        "districts": [
          "大溪區",
          "復興區"
        ],
        "stations": [
          {
            "name": "圳頂派出所",
            "type": "police_station"
          },
          {
            "name": "南雅派出所",
            "type": "police_station"
          },
          {
            "name": "三元派出所",
            "type": "police_station"
          },
          {
            "name": "中新派出所",
            "type": "police_station"
          },
          {
            "name": "內柵派出所",
            "type": "police_station"
          },
          {
            "name": "永福派出所",
            "type": "police_station"
          },
          {
            "name": "三層派出所",
            "type": "police_station"
          },
          {
            "name": "百吉派出所",
            "type": "police_station"
          },
          {
            "name": "復興分駐所",
            "type": "substation"
          },
          {
            "name": "三民派出所",
            "type": "police_station"
          },
          {
            "name": "溪內派出所",
            "type": "police_station"
          },
          {
            "name": "羅浮派出所",
            "type": "police_station"
          },
          {
            "name": "霞雲派出所",
            "type": "police_station"
          },
          {
            "name": "長興派出所",
            "type": "police_station"
          },
          {
            "name": "奎輝派出所",
            "type": "police_station"
          },
          {
            "name": "三光派出所",
            "type": "police_station"
          },
          {
            "name": "光華派出所",
            "type": "police_station"
          },
          {
            "name": "榮華派出所",
            "type": "police_station"
          },
          {
            "name": "巴陵派出所",
            "type": "police_station"
          }
        ]
      },
      {
        "id": "桃園市-中壢分局",
        "name": "中壢分局",
        "type": "division",
        "districts": [
          "中壢區"
        ],
        "stations": [
          {
            "name": "中壢派出所",
            "type": "police_station"
          },
          {
            "name": "興國派出所",
            "type": "police_station"
          },
          {
            "name": "普仁派出所",
            "type": "police_station"
          },
          {
            "name": "龍興派出所",
            "type": "police_station"
          },
          {
            "name": "文化派出所",
            "type": "police_station"
          },
          {
            "name": "中福派出所",
            "type": "police_station"
          },
          {
            "name": "內壢派出所",
            "type": "police_station"
          },
          {
            "name": "仁愛派出所",
            "type": "police_station"
          },
          {
            "name": "大崙派出所",
            "type": "police_station"
          },
          {
            "name": "自強派出所",
            "type": "police_station"
          },
          {
            "name": "青埔派出所",
            "type": "police_station"
          }
        ]
      },
      {
        "id": "桃園市-楊梅分局",
        "name": "楊梅分局",
        "type": "division",
        "districts": [
          "楊梅區",
          "新屋區"
        ],
        "stations": [
          {
            "name": "楊梅派出所",
            "type": "police_station"
          },
          {
            "name": "草湳派出所",
            "type": "police_station"
          },
          {
            "name": "幼獅派出所",
            "type": "police_station"
          },
          {
            "name": "富岡派出所",
            "type": "police_station"
          },
          {
            "name": "上湖派出所",
            "type": "police_station"
          },
          {
            "name": "新屋分駐所",
            "type": "substation"
          },
          {
            "name": "頭洲派出所",
            "type": "police_station"
          },
          {
            "name": "永安派出所",
            "type": "police_station"
          },
          {
            "name": "大坡派出所",
            "type": "police_station"
          }
        ]
      },
      {
        "id": "桃園市-大園分局",
        "name": "大園分局",
        "type": "division",
        "districts": [
          "大園區",
          "觀音區"
        ],
        "stations": [
          {
            "name": "大園派出所",
            "type": "police_station"
          },
          {
            "name": "竹圍派出所",
            "type": "police_station"
          },
          {
            "name": "埔心派出所",
            "type": "police_station"
          },
          {
            "name": "潮音派出所",
            "type": "police_station"
          },
          {
            "name": "三菓派出所",
            "type": "police_station"
          },
          {
            "name": "觀音分駐所",
            "type": "substation"
          },
          {
            "name": "新坡派出所",
            "type": "police_station"
          },
          {
            "name": "草漯派出所",
            "type": "police_station"
          }
        ]
      },
      {
        "id": "桃園市-平鎮分局",
        "name": "平鎮分局",
        "type": "division",
        "districts": [
          "平鎮區"
        ],
        "stations": [
          {
            "name": "平鎮派出所",
            "type": "police_station"
          },
          {
            "name": "宋屋派出所",
            "type": "police_station"
          },
          {
            "name": "北勢派出所",
            "type": "police_station"
          },
          {
            "name": "建安派出所",
            "type": "police_station"
          },
          {
            "name": "龍岡派出所",
            "type": "police_station"
          }
        ]
      },
      {
        "id": "桃園市-龜山分局",
        "name": "龜山分局",
        "type": "division",
        "districts": [
          "龜山區"
        ],
        "stations": [
          {
            "name": "龜山派出所",
            "type": "police_station"
          },
          {
            "name": "迴龍派出所",
            "type": "police_station"
          },
          {
            "name": "坪頂派出所",
            "type": "police_station"
          },
          {
            "name": "大埔派出所",
            "type": "police_station"
          },
          {
            "name": "大坑派出所",
            "type": "police_station"
          },
          {
            "name": "大林派出所",
            "type": "police_station"
          },
          {
            "name": "大華派出所",
            "type": "police_station"
          }
        ]
      },
      {
        "id": "桃園市-八德分局",
        "name": "八德分局",
        "type": "division",
        "districts": [
          "八德區"
        ],
        "stations": [
          {
            "name": "八德派出所",
            "type": "police_station"
          },
          {
            "name": "四維派出所",
            "type": "police_station"
          },
          {
            "name": "高明派出所",
            "type": "police_station"
          },
          {
            "name": "大安派出所",
            "type": "police_station"
          },
          {
            "name": "廣興派出所",
            "type": "police_station"
          }
        ]
      },
      {
        "id": "桃園市-龍潭分局",
        "name": "龍潭分局",
        "type": "division",
        "districts": [
          "龍潭區"
        ],
        "stations": [
          {
            "name": "龍潭派出所",
            "type": "police_station"
          },
          {
            "name": "中興派出所",
            "type": "police_station"
          },
          {
            "name": "聖亭派出所",
            "type": "police_station"
          },
          {
            "name": "石門派出所",
            "type": "police_station"
          },
          {
            "name": "高平派出所",
            "type": "police_station"
          },
          {
            "name": "三和派出所",
            "type": "police_station"
          }
        ]
      },
      {
        "id": "桃園市-蘆竹分局",
        "name": "蘆竹分局",
        "type": "division",
        "districts": [
          "蘆竹區"
        ],
        "stations": [
          {
            "name": "南崁派出所",
            "type": "police_station"
          },
          {
            "name": "大竹派出所",
            "type": "police_station"
          },
          {
            "name": "南竹派出所",
            "type": "police_station"
          },
          {
            "name": "外社派出所",
            "type": "police_station"
          }
        ]
      }
    ]
  },
  {
    "county": "臺中市",
    "divisions": [
      {
        "id": "臺中市-第一分局",
        "name": "第一分局",
        "type": "division",
        "districts": [
          "西區",
          "中區"
        ],
        "stations": [
          {
            "name": "大誠分駐所",
            "type": "substation"
          },
          {
            "name": "繼中派出所",
            "type": "police_station"
          },
          {
            "name": "西區派出所",
            "type": "police_station"
          },
          {
            "name": "民權派出所",
            "type": "police_station"
          },
          {
            "name": "公益派出所",
            "type": "police_station"
          }
        ]
      },
      {
        "id": "臺中市-第二分局",
        "name": "第二分局",
        "type": "division",
        "districts": [
          "北區"
        ],
        "stations": [
          {
            "name": "文正派出所",
            "type": "police_station"
          },
          {
            "name": "育才派出所",
            "type": "police_station"
          },
          {
            "name": "立人派出所",
            "type": "police_station"
          },
          {
            "name": "永興派出所",
            "type": "police_station"
          },
          {
            "name": "臺中公園派出所",
            "type": "police_station"
          }
        ]
      },
      {
        "id": "臺中市-第三分局",
        "name": "第三分局",
        "type": "division",
        "districts": [
          "南區",
          "東區"
        ],
        "stations": [
          {
            "name": "東區分駐所",
            "type": "substation"
          },
          {
            "name": "東信派出所",
            "type": "police_station"
          },
          {
            "name": "立德派出所",
            "type": "police_station"
          },
          {
            "name": "正義派出所",
            "type": "police_station"
          },
          {
            "name": "勤工派出所",
            "type": "police_station"
          },
          {
            "name": "健康派出所",
            "type": "police_station"
          }
        ]
      },
      {
        "id": "臺中市-第四分局",
        "name": "第四分局",
        "type": "division",
        "districts": [
          "南屯區"
        ],
        "stations": [
          {
            "name": "南屯派出所",
            "type": "police_station"
          },
          {
            "name": "春社派出所",
            "type": "police_station"
          },
          {
            "name": "黎明派出所",
            "type": "police_station"
          },
          {
            "name": "大墩派出所",
            "type": "police_station"
          }
        ]
      },
      {
        "id": "臺中市-第五分局",
        "name": "第五分局",
        "type": "division",
        "districts": [
          "北屯區"
        ],
        "stations": [
          {
            "name": "北屯派出所",
            "type": "police_station"
          },
          {
            "name": "四平派出所",
            "type": "police_station"
          },
          {
            "name": "水湳派出所",
            "type": "police_station"
          },
          {
            "name": "文昌派出所",
            "type": "police_station"
          },
          {
            "name": "東山派出所",
            "type": "police_station"
          },
          {
            "name": "松安派出所",
            "type": "police_station"
          }
        ]
      },
      {
        "id": "臺中市-第六分局",
        "name": "第六分局",
        "type": "division",
        "districts": [
          "西屯區"
        ],
        "stations": [
          {
            "name": "西屯派出所",
            "type": "police_station"
          },
          {
            "name": "何安派出所",
            "type": "police_station"
          },
          {
            "name": "協和派出所",
            "type": "police_station"
          },
          {
            "name": "市政派出所",
            "type": "police_station"
          },
          {
            "name": "工業區派出所",
            "type": "police_station"
          },
          {
            "name": "永福派出所",
            "type": "police_station"
          }
        ]
      },
      {
        "id": "臺中市-太平分局",
        "name": "太平分局",
        "type": "division",
        "districts": [
          "太平區"
        ],
        "stations": [
          {
            "name": "太平派出所",
            "type": "police_station"
          },
          {
            "name": "新平派出所",
            "type": "police_station"
          },
          {
            "name": "坪林派出所",
            "type": "police_station"
          },
          {
            "name": "頭汴派出所",
            "type": "police_station"
          },
          {
            "name": "宏龍派出所",
            "type": "police_station"
          }
        ]
      },
      {
        "id": "臺中市-霧峰分局",
        "name": "霧峰分局",
        "type": "division",
        "districts": [
          "霧峰區",
          "大里區"
        ],
        "stations": [
          {
            "name": "霧峰派出所",
            "type": "police_station"
          },
          {
            "name": "吉峰派出所",
            "type": "police_station"
          },
          {
            "name": "萬豐派出所",
            "type": "police_station"
          },
          {
            "name": "四德派出所",
            "type": "police_station"
          },
          {
            "name": "大里分駐所",
            "type": "substation"
          },
          {
            "name": "仁化派出所",
            "type": "police_station"
          },
          {
            "name": "內新派出所",
            "type": "police_station"
          },
          {
            "name": "成功派出所",
            "type": "police_station"
          },
          {
            "name": "國光派出所",
            "type": "police_station"
          },
          {
            "name": "十九甲派出所",
            "type": "police_station"
          }
        ]
      },
      {
        "id": "臺中市-烏日分局",
        "name": "烏日分局",
        "type": "division",
        "districts": [
          "烏日區",
          "大肚區",
          "龍井區"
        ],
        "stations": [
          {
            "name": "烏日派出所",
            "type": "police_station"
          },
          {
            "name": "溪南派出所",
            "type": "police_station"
          },
          {
            "name": "五光派出所",
            "type": "police_station"
          },
          {
            "name": "三和派出所",
            "type": "police_station"
          },
          {
            "name": "龍井分駐所",
            "type": "substation"
          },
          {
            "name": "龍東派出所",
            "type": "police_station"
          },
          {
            "name": "龍津派出所",
            "type": "police_station"
          },
          {
            "name": "麗水派出所",
            "type": "police_station"
          },
          {
            "name": "犁份派出所",
            "type": "police_station"
          },
          {
            "name": "大肚分駐所",
            "type": "substation"
          },
          {
            "name": "追分派出所",
            "type": "police_station"
          },
          {
            "name": "瑞井派出所",
            "type": "police_station"
          }
        ]
      },
      {
        "id": "臺中市-清水分局",
        "name": "清水分局",
        "type": "division",
        "districts": [
          "清水區",
          "沙鹿區",
          "梧棲區"
        ],
        "stations": [
          {
            "name": "清水派出所",
            "type": "police_station"
          },
          {
            "name": "大秀派出所",
            "type": "police_station"
          },
          {
            "name": "高美派出所",
            "type": "police_station"
          },
          {
            "name": "大楊派出所",
            "type": "police_station"
          },
          {
            "name": "三田派出所",
            "type": "police_station"
          },
          {
            "name": "沙鹿分駐所",
            "type": "substation"
          },
          {
            "name": "光華派出所",
            "type": "police_station"
          },
          {
            "name": "明秀派出所",
            "type": "police_station"
          },
          {
            "name": "清泉派出所",
            "type": "police_station"
          },
          {
            "name": "梧棲分駐所",
            "type": "substation"
          },
          {
            "name": "安寧派出所",
            "type": "police_station"
          }
        ]
      },
      {
        "id": "臺中市-大甲分局",
        "name": "大甲分局",
        "type": "division",
        "districts": [
          "大甲區",
          "外埔區",
          "大安區",
          "后里區"
        ],
        "stations": [
          {
            "name": "大甲派出所",
            "type": "police_station"
          },
          {
            "name": "日南派出所",
            "type": "police_station"
          },
          {
            "name": "西岐派出所",
            "type": "police_station"
          },
          {
            "name": "大安分駐所",
            "type": "substation"
          },
          {
            "name": "海墘派出所",
            "type": "police_station"
          },
          {
            "name": "外埔分駐所",
            "type": "substation"
          },
          {
            "name": "安定派出所",
            "type": "police_station"
          },
          {
            "name": "后里分駐所",
            "type": "substation"
          },
          {
            "name": "月眉派出所",
            "type": "police_station"
          },
          {
            "name": "義里派出所",
            "type": "police_station"
          },
          {
            "name": "泰安派出所",
            "type": "police_station"
          }
        ]
      },
      {
        "id": "臺中市-豐原分局",
        "name": "豐原分局",
        "type": "division",
        "districts": [
          "豐原區",
          "神岡區"
        ],
        "stations": [
          {
            "name": "豐原派出所",
            "type": "police_station"
          },
          {
            "name": "豐東派出所",
            "type": "police_station"
          },
          {
            "name": "合作派出所",
            "type": "police_station"
          },
          {
            "name": "頂街派出所",
            "type": "police_station"
          },
          {
            "name": "翁子派出所",
            "type": "police_station"
          },
          {
            "name": "神岡分駐所",
            "type": "substation"
          },
          {
            "name": "社口派出所",
            "type": "police_station"
          },
          {
            "name": "豐洲派出所",
            "type": "police_station"
          }
        ]
      },
      {
        "id": "臺中市-東勢分局",
        "name": "東勢分局",
        "type": "division",
        "districts": [
          "東勢區",
          "石岡區",
          "新社區"
        ],
        "stations": [
          {
            "name": "東勢派出所",
            "type": "police_station"
          },
          {
            "name": "茅埔派出所",
            "type": "police_station"
          },
          {
            "name": "中坑派出所",
            "type": "police_station"
          },
          {
            "name": "石城派出所",
            "type": "police_station"
          },
          {
            "name": "石岡分駐所",
            "type": "substation"
          },
          {
            "name": "土牛派出所",
            "type": "police_station"
          },
          {
            "name": "新社分駐所",
            "type": "substation"
          },
          {
            "name": "福中派出所",
            "type": "police_station"
          },
          {
            "name": "永源派出所",
            "type": "police_station"
          },
          {
            "name": "東興派出所",
            "type": "police_station"
          }
        ]
      },
      {
        "id": "臺中市-和平分局",
        "name": "和平分局",
        "type": "division",
        "districts": [
          "和平區"
        ],
        "stations": [
          {
            "name": "和平派出所",
            "type": "police_station"
          },
          {
            "name": "勝光派出所",
            "type": "police_station"
          },
          {
            "name": "志良派出所",
            "type": "police_station"
          },
          {
            "name": "環山派出所",
            "type": "police_station"
          },
          {
            "name": "松茂派出所",
            "type": "police_station"
          },
          {
            "name": "德基派出所",
            "type": "police_station"
          },
          {
            "name": "梨山派出所",
            "type": "police_station"
          },
          {
            "name": "雪山派出所",
            "type": "police_station"
          },
          {
            "name": "大棟派出所",
            "type": "police_station"
          },
          {
            "name": "桃山派出所",
            "type": "police_station"
          },
          {
            "name": "竹林派出所",
            "type": "police_station"
          },
          {
            "name": "雙崎派出所",
            "type": "police_station"
          },
          {
            "name": "谷關派出所",
            "type": "police_station"
          },
          {
            "name": "天輪派出所",
            "type": "police_station"
          }
        ]
      },
      {
        "id": "臺中市-大雅分局",
        "name": "大雅分局",
        "type": "division",
        "districts": [
          "大雅區",
          "潭子區"
        ],
        "stations": [
          {
            "name": "大雅派出所",
            "type": "police_station"
          },
          {
            "name": "馬岡派出所",
            "type": "police_station"
          },
          {
            "name": "潭子分駐所",
            "type": "substation"
          },
          {
            "name": "潭北派出所",
            "type": "police_station"
          },
          {
            "name": "頭家派出所",
            "type": "police_station"
          }
        ]
      }
    ]
  },
  {
    "county": "臺南市",
    "divisions": [
      {
        "id": "臺南市-第一分局",
        "name": "第一分局",
        "type": "division",
        "districts": [
          "東區"
        ],
        "stations": [
          {
            "name": "東寧派出所",
            "type": "police_station"
          },
          {
            "name": "府東派出所",
            "type": "police_station"
          },
          {
            "name": "後甲派出所",
            "type": "police_station"
          },
          {
            "name": "莊敬派出所",
            "type": "police_station"
          },
          {
            "name": "文化派出所",
            "type": "police_station"
          },
          {
            "name": "東門派出所",
            "type": "police_station"
          },
          {
            "name": "德高派出所",
            "type": "police_station"
          }
        ]
      },
      {
        "id": "臺南市-第二分局",
        "name": "第二分局",
        "type": "division",
        "districts": [
          "中西區"
        ],
        "stations": [
          {
            "name": "長樂派出所",
            "type": "police_station"
          },
          {
            "name": "南門派出所",
            "type": "police_station"
          },
          {
            "name": "海安派出所",
            "type": "police_station"
          },
          {
            "name": "民權派出所",
            "type": "police_station"
          },
          {
            "name": "中正派出所",
            "type": "police_station"
          },
          {
            "name": "博愛派出所",
            "type": "police_station"
          }
        ]
      },
      {
        "id": "臺南市-第三分局",
        "name": "第三分局",
        "type": "division",
        "districts": [
          "安南區"
        ],
        "stations": [
          {
            "name": "安中派出所",
            "type": "police_station"
          },
          {
            "name": "安佃派出所",
            "type": "police_station"
          },
          {
            "name": "顯宮派出所",
            "type": "police_station"
          },
          {
            "name": "土城派出所",
            "type": "police_station"
          },
          {
            "name": "海南派出所",
            "type": "police_station"
          },
          {
            "name": "長安派出所",
            "type": "police_station"
          },
          {
            "name": "和順派出所",
            "type": "police_station"
          },
          {
            "name": "安順派出所",
            "type": "police_station"
          },
          {
            "name": "安南派出所",
            "type": "police_station"
          }
        ]
      },
      {
        "id": "臺南市-第四分局",
        "name": "第四分局",
        "type": "division",
        "districts": [
          "安平區"
        ],
        "stations": [
          {
            "name": "安平派出所",
            "type": "police_station"
          },
          {
            "name": "育平派出所",
            "type": "police_station"
          },
          {
            "name": "華平派出所",
            "type": "police_station"
          }
        ]
      },
      {
        "id": "臺南市-第五分局",
        "name": "第五分局",
        "type": "division",
        "districts": [
          "北區"
        ],
        "stations": [
          {
            "name": "和緯派出所",
            "type": "police_station"
          },
          {
            "name": "實踐派出所",
            "type": "police_station"
          },
          {
            "name": "立人派出所",
            "type": "police_station"
          },
          {
            "name": "公園派出所",
            "type": "police_station"
          },
          {
            "name": "開元派出所",
            "type": "police_station"
          },
          {
            "name": "北門派出所",
            "type": "police_station"
          }
        ]
      },
      {
        "id": "臺南市-第六分局",
        "name": "第六分局",
        "type": "division",
        "districts": [
          "南區"
        ],
        "stations": [
          {
            "name": "金華派出所",
            "type": "police_station"
          },
          {
            "name": "大林派出所",
            "type": "police_station"
          },
          {
            "name": "鹽埕派出所",
            "type": "police_station"
          },
          {
            "name": "新興派出所",
            "type": "police_station"
          },
          {
            "name": "灣裡派出所",
            "type": "police_station"
          },
          {
            "name": "喜樹派出所",
            "type": "police_station"
          },
          {
            "name": "鯤鯓派出所",
            "type": "police_station"
          }
        ]
      },
      {
        "id": "臺南市-新營分局",
        "name": "新營分局",
        "type": "division",
        "districts": [
          "新營區",
          "鹽水區",
          "柳營區"
        ],
        "stations": [
          {
            "name": "民治派出所",
            "type": "police_station"
          },
          {
            "name": "中山路派出所",
            "type": "police_station"
          },
          {
            "name": "後鎮派出所",
            "type": "police_station"
          },
          {
            "name": "太宮派出所",
            "type": "police_station"
          },
          {
            "name": "鹽水分駐所",
            "type": "substation"
          },
          {
            "name": "華雅派出所",
            "type": "police_station"
          },
          {
            "name": "竹埔派出所",
            "type": "police_station"
          },
          {
            "name": "柳營分駐所",
            "type": "substation"
          },
          {
            "name": "重溪派出所",
            "type": "police_station"
          },
          {
            "name": "果毅派出所",
            "type": "police_station"
          }
        ]
      },
      {
        "id": "臺南市-白河分局",
        "name": "白河分局",
        "type": "division",
        "districts": [
          "白河區",
          "東山區",
          "後壁區"
        ],
        "stations": [
          {
            "name": "白河派出所",
            "type": "police_station"
          },
          {
            "name": "內角派出所",
            "type": "police_station"
          },
          {
            "name": "竹門派出所",
            "type": "police_station"
          },
          {
            "name": "玉豐派出所",
            "type": "police_station"
          },
          {
            "name": "河東派出所",
            "type": "police_station"
          },
          {
            "name": "仙草派出所",
            "type": "police_station"
          },
          {
            "name": "關嶺派出所",
            "type": "police_station"
          },
          {
            "name": "東山分駐所",
            "type": "substation"
          },
          {
            "name": "東河派出所",
            "type": "police_station"
          },
          {
            "name": "東原派出所",
            "type": "police_station"
          },
          {
            "name": "後壁分駐所",
            "type": "substation"
          },
          {
            "name": "安溪派出所",
            "type": "police_station"
          },
          {
            "name": "菁寮派出所",
            "type": "police_station"
          },
          {
            "name": "長安派出所",
            "type": "police_station"
          }
        ]
      },
      {
        "id": "臺南市-佳里分局",
        "name": "佳里分局",
        "type": "division",
        "districts": [
          "佳里區",
          "七股區",
          "西港區"
        ],
        "stations": [
          {
            "name": "佳里派出所",
            "type": "police_station"
          },
          {
            "name": "子龍派出所",
            "type": "police_station"
          },
          {
            "name": "佳興派出所",
            "type": "police_station"
          },
          {
            "name": "延平派出所",
            "type": "police_station"
          },
          {
            "name": "塭內派出所",
            "type": "police_station"
          },
          {
            "name": "七股分駐所",
            "type": "substation"
          },
          {
            "name": "竹橋派出所",
            "type": "police_station"
          },
          {
            "name": "三股派出所",
            "type": "police_station"
          },
          {
            "name": "中鹽派出所",
            "type": "police_station"
          },
          {
            "name": "後港派出所",
            "type": "police_station"
          },
          {
            "name": "西港分駐所",
            "type": "substation"
          },
          {
            "name": "後營派出所",
            "type": "police_station"
          }
        ]
      },
      {
        "id": "臺南市-學甲分局",
        "name": "學甲分局",
        "type": "division",
        "districts": [
          "學甲區",
          "北門區",
          "將軍區"
        ],
        "stations": [
          {
            "name": "學甲派出所",
            "type": "police_station"
          },
          {
            "name": "中浯派出所",
            "type": "police_station"
          },
          {
            "name": "宅港派出所",
            "type": "police_station"
          },
          {
            "name": "頂洲派出所",
            "type": "police_station"
          },
          {
            "name": "將軍分駐所",
            "type": "substation"
          },
          {
            "name": "將富派出所",
            "type": "police_station"
          },
          {
            "name": "青鯤鯓派出所",
            "type": "police_station"
          },
          {
            "name": "北門分駐所",
            "type": "substation"
          },
          {
            "name": "蚵寮派出所",
            "type": "police_station"
          }
        ]
      },
      {
        "id": "臺南市-麻豆分局",
        "name": "麻豆分局",
        "type": "division",
        "districts": [
          "麻豆區",
          "下營區",
          "六甲區",
          "官田區"
        ],
        "stations": [
          {
            "name": "麻豆派出所",
            "type": "police_station"
          },
          {
            "name": "安業派出所",
            "type": "police_station"
          },
          {
            "name": "埤頭派出所",
            "type": "police_station"
          },
          {
            "name": "總爺派出所",
            "type": "police_station"
          },
          {
            "name": "下營分駐所",
            "type": "substation"
          },
          {
            "name": "茅港派出所",
            "type": "police_station"
          },
          {
            "name": "六甲分駐所",
            "type": "substation"
          },
          {
            "name": "鳳林派出所",
            "type": "police_station"
          },
          {
            "name": "大丘派出所",
            "type": "police_station"
          },
          {
            "name": "官田分駐所",
            "type": "substation"
          },
          {
            "name": "官鎮派出所",
            "type": "police_station"
          },
          {
            "name": "拔林派出所",
            "type": "police_station"
          },
          {
            "name": "湖山派出所",
            "type": "police_station"
          }
        ]
      },
      {
        "id": "臺南市-善化分局",
        "name": "善化分局",
        "type": "division",
        "districts": [
          "善化區",
          "新市區",
          "安定區",
          "大內區"
        ],
        "stations": [
          {
            "name": "善化派出所",
            "type": "police_station"
          },
          {
            "name": "茄拔派出所",
            "type": "police_station"
          },
          {
            "name": "東昌派出所",
            "type": "police_station"
          },
          {
            "name": "溪美派出所",
            "type": "police_station"
          },
          {
            "name": "蘇厝派出所",
            "type": "police_station"
          },
          {
            "name": "安定分駐所",
            "type": "substation"
          },
          {
            "name": "港口派出所",
            "type": "police_station"
          },
          {
            "name": "海寮派出所",
            "type": "police_station"
          },
          {
            "name": "大內分駐所",
            "type": "substation"
          },
          {
            "name": "頭社派出所",
            "type": "police_station"
          },
          {
            "name": "二溪派出所",
            "type": "police_station"
          },
          {
            "name": "新市分駐所",
            "type": "substation"
          },
          {
            "name": "潭頂派出所",
            "type": "police_station"
          }
        ]
      },
      {
        "id": "臺南市-新化分局",
        "name": "新化分局",
        "type": "division",
        "districts": [
          "新化區",
          "左鎮區",
          "山上區"
        ],
        "stations": [
          {
            "name": "新化派出所",
            "type": "police_station"
          },
          {
            "name": "唪口派出所",
            "type": "police_station"
          },
          {
            "name": "知義派出所",
            "type": "police_station"
          },
          {
            "name": "那拔派出所",
            "type": "police_station"
          },
          {
            "name": "山上分駐所",
            "type": "substation"
          },
          {
            "name": "左鎮分駐所",
            "type": "substation"
          },
          {
            "name": "岡林派出所",
            "type": "police_station"
          }
        ]
      },
      {
        "id": "臺南市-玉井分局",
        "name": "玉井分局",
        "type": "division",
        "districts": [
          "玉井區",
          "南化區",
          "楠西區"
        ],
        "stations": [
          {
            "name": "玉井派出所",
            "type": "police_station"
          },
          {
            "name": "望明派出所",
            "type": "police_station"
          },
          {
            "name": "南化分駐所",
            "type": "substation"
          },
          {
            "name": "玉山派出所",
            "type": "police_station"
          },
          {
            "name": "北寮派出所",
            "type": "police_station"
          },
          {
            "name": "楠西分駐所",
            "type": "substation"
          },
          {
            "name": "鹿田派出所",
            "type": "police_station"
          }
        ]
      },
      {
        "id": "臺南市-永康分局",
        "name": "永康分局",
        "type": "division",
        "districts": [
          "永康區"
        ],
        "stations": [
          {
            "name": "永康派出所",
            "type": "police_station"
          },
          {
            "name": "鹽行派出所",
            "type": "police_station"
          },
          {
            "name": "大灣派出所",
            "type": "police_station"
          },
          {
            "name": "復興派出所",
            "type": "police_station"
          },
          {
            "name": "龍潭派出所",
            "type": "police_station"
          },
          {
            "name": "大橋派出所",
            "type": "police_station"
          },
          {
            "name": "永信派出所",
            "type": "police_station"
          }
        ]
      },
      {
        "id": "臺南市-歸仁分局",
        "name": "歸仁分局",
        "type": "division",
        "districts": [
          "歸仁區",
          "仁德區",
          "關廟區",
          "龍崎區"
        ],
        "stations": [
          {
            "name": "仁德分駐所",
            "type": "substation"
          },
          {
            "name": "太廟派出所",
            "type": "police_station"
          },
          {
            "name": "德南派出所",
            "type": "police_station"
          },
          {
            "name": "文賢派出所",
            "type": "police_station"
          },
          {
            "name": "大潭派出所",
            "type": "police_station"
          },
          {
            "name": "歸仁派出所",
            "type": "police_station"
          },
          {
            "name": "歸南派出所",
            "type": "police_station"
          },
          {
            "name": "媽廟派出所",
            "type": "police_station"
          },
          {
            "name": "南雄派出所",
            "type": "police_station"
          },
          {
            "name": "關廟分駐所",
            "type": "substation"
          },
          {
            "name": "龍崎分駐所",
            "type": "substation"
          },
          {
            "name": "龍船派出所",
            "type": "police_station"
          }
        ]
      }
    ]
  },
  {
    "county": "高雄市",
    "divisions": [
      {
        "id": "高雄市-新興分局",
        "name": "新興分局",
        "type": "division",
        "districts": [
          "新興區",
          "前金區"
        ],
        "stations": [
          {
            "name": "中正三路派出所",
            "type": "police_station"
          },
          {
            "name": "中山路派出所",
            "type": "police_station"
          },
          {
            "name": "五福二路派出所",
            "type": "police_station"
          },
          {
            "name": "自強路派出所",
            "type": "police_station"
          },
          {
            "name": "前金分駐所",
            "type": "substation"
          }
        ]
      },
      {
        "id": "高雄市-鹽埕分局",
        "name": "鹽埕分局",
        "type": "division",
        "districts": [
          "鹽埕區"
        ],
        "stations": [
          {
            "name": "五福四路派出所",
            "type": "police_station"
          },
          {
            "name": "建國四路派出所",
            "type": "police_station"
          },
          {
            "name": "七賢路派出所",
            "type": "police_station"
          }
        ]
      },
      {
        "id": "高雄市-左營分局",
        "name": "左營分局",
        "type": "division",
        "districts": [
          "左營區"
        ],
        "stations": [
          {
            "name": "左營派出所",
            "type": "police_station"
          },
          {
            "name": "博愛四路派出所",
            "type": "police_station"
          },
          {
            "name": "四海派出所",
            "type": "police_station"
          },
          {
            "name": "文自派出所",
            "type": "police_station"
          },
          {
            "name": "新莊派出所",
            "type": "police_station"
          },
          {
            "name": "啟文派出所",
            "type": "police_station"
          },
          {
            "name": "舊城派出所",
            "type": "police_station"
          }
        ]
      },
      {
        "id": "高雄市-楠梓分局",
        "name": "楠梓分局",
        "type": "division",
        "districts": [
          "楠梓區"
        ],
        "stations": [
          {
            "name": "楠梓派出所",
            "type": "police_station"
          },
          {
            "name": "加昌派出所",
            "type": "police_station"
          },
          {
            "name": "右昌派出所",
            "type": "police_station"
          },
          {
            "name": "後勁派出所",
            "type": "police_station"
          },
          {
            "name": "翠屏派出所",
            "type": "police_station"
          }
        ]
      },
      {
        "id": "高雄市-鼓山分局",
        "name": "鼓山分局",
        "type": "division",
        "districts": [
          "鼓山區",
          "旗津區"
        ],
        "stations": [
          {
            "name": "鼓山派出所",
            "type": "police_station"
          },
          {
            "name": "龍華派出所",
            "type": "police_station"
          },
          {
            "name": "內惟派出所",
            "type": "police_station"
          },
          {
            "name": "新濱派出所",
            "type": "police_station"
          },
          {
            "name": "旗津分駐所",
            "type": "substation"
          },
          {
            "name": "中洲派出所",
            "type": "police_station"
          }
        ]
      },
      {
        "id": "高雄市-苓雅分局",
        "name": "苓雅分局",
        "type": "division",
        "districts": [
          "苓雅區"
        ],
        "stations": [
          {
            "name": "福德二路派出所",
            "type": "police_station"
          },
          {
            "name": "凱旋路派出所",
            "type": "police_station"
          },
          {
            "name": "三多路派出所",
            "type": "police_station"
          },
          {
            "name": "民權路派出所",
            "type": "police_station"
          },
          {
            "name": "成功路派出所",
            "type": "police_station"
          }
        ]
      },
      {
        "id": "高雄市-三民第一分局",
        "name": "三民第一分局",
        "type": "division",
        "districts": [
          "三民區"
        ],
        "stations": [
          {
            "name": "三民派出所",
            "type": "police_station"
          },
          {
            "name": "哈爾濱街派出所",
            "type": "police_station"
          },
          {
            "name": "十全路派出所",
            "type": "police_station"
          },
          {
            "name": "長明派出所",
            "type": "police_station"
          }
        ]
      },
      {
        "id": "高雄市-三民第二分局",
        "name": "三民第二分局",
        "type": "division",
        "districts": [
          "三民區"
        ],
        "stations": [
          {
            "name": "鼎山派出所",
            "type": "police_station"
          },
          {
            "name": "陽明派出所",
            "type": "police_station"
          },
          {
            "name": "鼎金派出所",
            "type": "police_station"
          },
          {
            "name": "民族路派出所",
            "type": "police_station"
          },
          {
            "name": "覺民派出所",
            "type": "police_station"
          }
        ]
      },
      {
        "id": "高雄市-前鎮分局",
        "name": "前鎮分局",
        "type": "division",
        "districts": [
          "前鎮區"
        ],
        "stations": [
          {
            "name": "一心路派出所",
            "type": "police_station"
          },
          {
            "name": "瑞隆派出所",
            "type": "police_station"
          },
          {
            "name": "草衙派出所",
            "type": "police_station"
          },
          {
            "name": "前鎮街派出所",
            "type": "police_station"
          },
          {
            "name": "復興路派出所",
            "type": "police_station"
          }
        ]
      },
      {
        "id": "高雄市-小港分局",
        "name": "小港分局",
        "type": "division",
        "districts": [
          "小港區"
        ],
        "stations": [
          {
            "name": "小港派出所",
            "type": "police_station"
          },
          {
            "name": "大林派出所",
            "type": "police_station"
          },
          {
            "name": "高松派出所",
            "type": "police_station"
          },
          {
            "name": "桂陽路派出所",
            "type": "police_station"
          },
          {
            "name": "漢民派出所",
            "type": "police_station"
          }
        ]
      },
      {
        "id": "高雄市-鳳山分局",
        "name": "鳳山分局",
        "type": "division",
        "districts": [
          "鳳山區"
        ],
        "stations": [
          {
            "name": "鳳崗派出所",
            "type": "police_station"
          },
          {
            "name": "成功派出所",
            "type": "police_station"
          },
          {
            "name": "文山派出所",
            "type": "police_station"
          },
          {
            "name": "埤頂派出所",
            "type": "police_station"
          },
          {
            "name": "五甲派出所",
            "type": "police_station"
          },
          {
            "name": "新甲派出所",
            "type": "police_station"
          },
          {
            "name": "忠孝派出所",
            "type": "police_station"
          },
          {
            "name": "過埤派出所",
            "type": "police_station"
          },
          {
            "name": "南成派出所",
            "type": "police_station"
          },
          {
            "name": "中崙駐在所",
            "type": "post"
          },
          {
            "name": "衛武營都會公園駐在所",
            "type": "post"
          }
        ]
      },
      {
        "id": "高雄市-林園分局",
        "name": "林園分局",
        "type": "division",
        "districts": [
          "林園區",
          "大寮區"
        ],
        "stations": [
          {
            "name": "林園派出所",
            "type": "police_station"
          },
          {
            "name": "港埔派出所",
            "type": "police_station"
          },
          {
            "name": "中芸派出所",
            "type": "police_station"
          },
          {
            "name": "昭明派出所",
            "type": "police_station"
          },
          {
            "name": "忠義派出所",
            "type": "police_station"
          },
          {
            "name": "中莊派出所",
            "type": "police_station"
          },
          {
            "name": "大寮分駐所",
            "type": "substation"
          },
          {
            "name": "大發駐在所",
            "type": "post"
          }
        ]
      },
      {
        "id": "高雄市-仁武分局",
        "name": "仁武分局",
        "type": "division",
        "districts": [
          "仁武區",
          "大樹區",
          "鳥松區",
          "大社區"
        ],
        "stations": [
          {
            "name": "仁武派出所",
            "type": "police_station"
          },
          {
            "name": "澄觀派出所",
            "type": "police_station"
          },
          {
            "name": "大社分駐所",
            "type": "substation"
          },
          {
            "name": "大華派出所",
            "type": "police_station"
          },
          {
            "name": "仁美派出所",
            "type": "police_station"
          },
          {
            "name": "鳥松分駐所",
            "type": "substation"
          },
          {
            "name": "九曲派出所",
            "type": "police_station"
          },
          {
            "name": "溪埔派出所",
            "type": "police_station"
          },
          {
            "name": "大樹分駐所",
            "type": "substation"
          }
        ]
      },
      {
        "id": "高雄市-旗山分局",
        "name": "旗山分局",
        "type": "division",
        "districts": [
          "旗山區",
          "美濃區",
          "內門區",
          "杉林區",
          "甲仙區"
        ],
        "stations": [
          {
            "name": "建國派出所",
            "type": "police_station"
          },
          {
            "name": "大洲派出所",
            "type": "police_station"
          },
          {
            "name": "嶺口派出所",
            "type": "police_station"
          },
          {
            "name": "旗尾派出所",
            "type": "police_station"
          },
          {
            "name": "圓潭派出所",
            "type": "police_station"
          },
          {
            "name": "廣福派出所",
            "type": "police_station"
          },
          {
            "name": "吉東派出所",
            "type": "police_station"
          },
          {
            "name": "龍肚派出所",
            "type": "police_station"
          },
          {
            "name": "廣興派出所",
            "type": "police_station"
          },
          {
            "name": "中壇派出所",
            "type": "police_station"
          },
          {
            "name": "美濃分駐所",
            "type": "substation"
          },
          {
            "name": "中埔派出所",
            "type": "police_station"
          },
          {
            "name": "溝坪派出所",
            "type": "police_station"
          },
          {
            "name": "內門分駐所",
            "type": "substation"
          },
          {
            "name": "合森派出所",
            "type": "police_station"
          },
          {
            "name": "茄興派出所",
            "type": "police_station"
          },
          {
            "name": "杉林分駐所",
            "type": "substation"
          },
          {
            "name": "里關派出所",
            "type": "police_station"
          },
          {
            "name": "甲仙分駐所",
            "type": "substation"
          }
        ]
      },
      {
        "id": "高雄市-六龜分局",
        "name": "六龜分局",
        "type": "division",
        "districts": [
          "六龜區",
          "茂林區",
          "那瑪夏區",
          "桃源區"
        ],
        "stations": [
          {
            "name": "義寶派出所",
            "type": "police_station"
          },
          {
            "name": "寶來派出所",
            "type": "police_station"
          },
          {
            "name": "荖濃派出所",
            "type": "police_station"
          },
          {
            "name": "新威派出所",
            "type": "police_station"
          },
          {
            "name": "萬山派出所",
            "type": "police_station"
          },
          {
            "name": "多納派出所",
            "type": "police_station"
          },
          {
            "name": "茂林分駐所",
            "type": "substation"
          },
          {
            "name": "那瑪夏分駐所",
            "type": "substation"
          },
          {
            "name": "達卡努瓦派出所",
            "type": "police_station"
          },
          {
            "name": "桃源分駐所",
            "type": "substation"
          },
          {
            "name": "森濤派出所",
            "type": "police_station"
          },
          {
            "name": "寶山派出所",
            "type": "police_station"
          },
          {
            "name": "高中派出所",
            "type": "police_station"
          },
          {
            "name": "梅山派出所",
            "type": "police_station"
          },
          {
            "name": "拉芙蘭派出所",
            "type": "police_station"
          }
        ]
      },
      {
        "id": "高雄市-岡山分局",
        "name": "岡山分局",
        "type": "division",
        "districts": [
          "岡山區",
          "燕巢區",
          "橋頭區",
          "梓官區",
          "彌陀區",
          "永安區"
        ],
        "stations": [
          {
            "name": "壽天派出所",
            "type": "police_station"
          },
          {
            "name": "前峰派出所",
            "type": "police_station"
          },
          {
            "name": "嘉興派出所",
            "type": "police_station"
          },
          {
            "name": "甲圍派出所",
            "type": "police_station"
          },
          {
            "name": "橋頭分駐所",
            "type": "substation"
          },
          {
            "name": "燕巢分駐所",
            "type": "substation"
          },
          {
            "name": "鳳雄派出所",
            "type": "police_station"
          },
          {
            "name": "深水派出所",
            "type": "police_station"
          },
          {
            "name": "梓官分駐所",
            "type": "substation"
          },
          {
            "name": "赤崁派出所",
            "type": "police_station"
          },
          {
            "name": "彌陀分駐所",
            "type": "substation"
          },
          {
            "name": "舊港派出所",
            "type": "police_station"
          },
          {
            "name": "永安分駐所",
            "type": "substation"
          }
        ]
      },
      {
        "id": "高雄市-湖內分局",
        "name": "湖內分局",
        "type": "division",
        "districts": [
          "湖內區",
          "路竹區",
          "茄萣區",
          "田寮區",
          "阿蓮區"
        ],
        "stations": [
          {
            "name": "湖街派出所",
            "type": "police_station"
          },
          {
            "name": "湖內派出所",
            "type": "police_station"
          },
          {
            "name": "路竹分駐所",
            "type": "substation"
          },
          {
            "name": "竹滬派出所",
            "type": "police_station"
          },
          {
            "name": "一甲派出所",
            "type": "police_station"
          },
          {
            "name": "茄萣分駐所",
            "type": "substation"
          },
          {
            "name": "砂崙派出所",
            "type": "police_station"
          },
          {
            "name": "田寮分駐所",
            "type": "substation"
          },
          {
            "name": "崇德派出所",
            "type": "police_station"
          },
          {
            "name": "蛙潭派出所",
            "type": "police_station"
          },
          {
            "name": "古亭派出所",
            "type": "police_station"
          },
          {
            "name": "阿蓮分駐所",
            "type": "substation"
          }
        ]
      }
    ]
  },
  {
    "county": "基隆市",
    "divisions": [
      {
        "id": "基隆市-第一分局",
        "name": "第一分局",
        "type": "division",
        "districts": [
          "仁愛區"
        ],
        "stations": [
          {
            "name": "忠二路派出所",
            "type": "police_station"
          },
          {
            "name": "南榮路派出所",
            "type": "police_station"
          },
          {
            "name": "延平街派出所",
            "type": "police_station"
          }
        ]
      },
      {
        "id": "基隆市-第二分局",
        "name": "第二分局",
        "type": "division",
        "districts": [
          "信義區",
          "中正區"
        ],
        "stations": [
          {
            "name": "信義派出所",
            "type": "police_station"
          },
          {
            "name": "東光派出所",
            "type": "police_station"
          },
          {
            "name": "深澳坑派出所",
            "type": "police_station"
          },
          {
            "name": "八斗子分駐所",
            "type": "substation"
          },
          {
            "name": "信六路派出所",
            "type": "police_station"
          },
          {
            "name": "安瀾橋派出所",
            "type": "police_station"
          },
          {
            "name": "和一路派出所",
            "type": "police_station"
          },
          {
            "name": "正濱派出所",
            "type": "police_station"
          }
        ]
      },
      {
        "id": "基隆市-第三分局",
        "name": "第三分局",
        "type": "division",
        "districts": [
          "七堵區",
          "暖暖區"
        ],
        "stations": [
          {
            "name": "七堵派出所",
            "type": "police_station"
          },
          {
            "name": "百福派出所",
            "type": "police_station"
          },
          {
            "name": "復興派出所",
            "type": "police_station"
          },
          {
            "name": "瑪陵派出所",
            "type": "police_station"
          },
          {
            "name": "八堵分駐所",
            "type": "substation"
          },
          {
            "name": "暖暖派出所",
            "type": "police_station"
          },
          {
            "name": "碇內派出所",
            "type": "police_station"
          }
        ]
      },
      {
        "id": "基隆市-第四分局",
        "name": "第四分局",
        "type": "division",
        "districts": [
          "安樂區",
          "中山區"
        ],
        "stations": [
          {
            "name": "安樂派出所",
            "type": "police_station"
          },
          {
            "name": "安定派出所",
            "type": "police_station"
          },
          {
            "name": "大武崙派出所",
            "type": "police_station"
          },
          {
            "name": "中華路分駐所",
            "type": "substation"
          },
          {
            "name": "中山派出所",
            "type": "police_station"
          }
        ]
      }
    ]
  },
  {
    "county": "新竹市",
    "divisions": [
      {
        "id": "新竹市-第一分局",
        "name": "第一分局",
        "type": "division",
        "districts": [
          "北區"
        ],
        "stations": [
          {
            "name": "北門派出所",
            "type": "police_station"
          },
          {
            "name": "西門派出所",
            "type": "police_station"
          },
          {
            "name": "湳雅派出所",
            "type": "police_station"
          },
          {
            "name": "南寮派出所",
            "type": "police_station"
          },
          {
            "name": "樹林頭派出所",
            "type": "police_station"
          }
        ]
      },
      {
        "id": "新竹市-第二分局",
        "name": "第二分局",
        "type": "division",
        "districts": [
          "東區"
        ],
        "stations": [
          {
            "name": "東門派出所",
            "type": "police_station"
          },
          {
            "name": "東勢派出所",
            "type": "police_station"
          },
          {
            "name": "埔頂派出所",
            "type": "police_station"
          },
          {
            "name": "文華派出所",
            "type": "police_station"
          },
          {
            "name": "關東橋派出所",
            "type": "police_station"
          }
        ]
      },
      {
        "id": "新竹市-第三分局",
        "name": "第三分局",
        "type": "division",
        "districts": [
          "香山區"
        ],
        "stations": [
          {
            "name": "香山派出所",
            "type": "police_station"
          },
          {
            "name": "朝山派出所",
            "type": "police_station"
          },
          {
            "name": "中華派出所",
            "type": "police_station"
          },
          {
            "name": "南門派出所",
            "type": "police_station"
          },
          {
            "name": "青草湖派出所",
            "type": "police_station"
          }
        ]
      }
    ]
  },
  {
    "county": "新竹縣",
    "divisions": [
      {
        "id": "新竹縣-竹北分局",
        "name": "竹北分局",
        "type": "division",
        "districts": [
          "竹北市"
        ],
        "stations": [
          {
            "name": "竹北派出所",
            "type": "police_station"
          },
          {
            "name": "六家派出所",
            "type": "police_station"
          },
          {
            "name": "鳳岡派出所",
            "type": "police_station"
          },
          {
            "name": "豐田派出所",
            "type": "police_station"
          },
          {
            "name": "三民派出所",
            "type": "police_station"
          },
          {
            "name": "高鐵派出所",
            "type": "police_station"
          }
        ]
      },
      {
        "id": "新竹縣-新埔分局",
        "name": "新埔分局",
        "type": "division",
        "districts": [
          "新埔鎮",
          "關西鎮"
        ],
        "stations": [
          {
            "name": "新埔派出所",
            "type": "police_station"
          },
          {
            "name": "褒忠派出所",
            "type": "police_station"
          },
          {
            "name": "寶石派出所",
            "type": "police_station"
          },
          {
            "name": "照門派出所",
            "type": "police_station"
          },
          {
            "name": "關西分駐所",
            "type": "substation"
          },
          {
            "name": "石光派出所",
            "type": "police_station"
          },
          {
            "name": "東安派出所",
            "type": "police_station"
          },
          {
            "name": "錦山派出所",
            "type": "police_station"
          }
        ]
      },
      {
        "id": "新竹縣-竹東分局",
        "name": "竹東分局",
        "type": "division",
        "districts": [
          "竹東鎮",
          "寶山鄉",
          "北埔鄉",
          "峨眉鄉",
          "五峰鄉"
        ],
        "stations": [
          {
            "name": "竹東派出所",
            "type": "police_station"
          },
          {
            "name": "下公館派出所",
            "type": "police_station"
          },
          {
            "name": "二重埔派出所",
            "type": "police_station"
          },
          {
            "name": "上坪派出所",
            "type": "police_station"
          },
          {
            "name": "寶山分駐所",
            "type": "substation"
          },
          {
            "name": "新城派出所",
            "type": "police_station"
          },
          {
            "name": "楓橋派出所",
            "type": "police_station"
          },
          {
            "name": "北埔分駐所",
            "type": "substation"
          },
          {
            "name": "峨眉分駐所",
            "type": "substation"
          },
          {
            "name": "富興派出所",
            "type": "police_station"
          },
          {
            "name": "五峰分駐所",
            "type": "substation"
          },
          {
            "name": "花園派出所",
            "type": "police_station"
          },
          {
            "name": "茅圃派出所",
            "type": "police_station"
          },
          {
            "name": "桃山派出所",
            "type": "police_station"
          }
        ]
      },
      {
        "id": "新竹縣-橫山分局",
        "name": "橫山分局",
        "type": "division",
        "districts": [
          "橫山鄉",
          "芎林鄉",
          "尖石鄉"
        ],
        "stations": [
          {
            "name": "橫山派出所",
            "type": "police_station"
          },
          {
            "name": "橫村派出所",
            "type": "police_station"
          },
          {
            "name": "內灣派出所",
            "type": "police_station"
          },
          {
            "name": "芎林分駐所",
            "type": "substation"
          },
          {
            "name": "秀湖派出所",
            "type": "police_station"
          },
          {
            "name": "尖石分駐所",
            "type": "substation"
          },
          {
            "name": "新樂派出所",
            "type": "police_station"
          },
          {
            "name": "梅花派出所",
            "type": "police_station"
          },
          {
            "name": "宇老派出所",
            "type": "police_station"
          },
          {
            "name": "秀巒派出所",
            "type": "police_station"
          },
          {
            "name": "泰崗派出所",
            "type": "police_station"
          }
        ]
      },
      {
        "id": "新竹縣-新湖分局",
        "name": "新湖分局",
        "type": "division",
        "districts": [
          "新豐鄉",
          "湖口鄉"
        ],
        "stations": [
          {
            "name": "湖口派出所",
            "type": "police_station"
          },
          {
            "name": "新工派出所",
            "type": "police_station"
          },
          {
            "name": "湖鏡派出所",
            "type": "police_station"
          },
          {
            "name": "新豐分駐所",
            "type": "substation"
          },
          {
            "name": "山崎派出所",
            "type": "police_station"
          },
          {
            "name": "後湖派出所",
            "type": "police_station"
          }
        ]
      }
    ]
  },
  {
    "county": "苗栗縣",
    "divisions": [
      {
        "id": "苗栗縣-竹南分局",
        "name": "竹南分局",
        "type": "division",
        "districts": [
          "竹南鎮",
          "造橋鄉",
          "後龍鎮"
        ],
        "stations": [
          {
            "name": "竹南派出所",
            "type": "police_station"
          },
          {
            "name": "中港派出所",
            "type": "police_station"
          },
          {
            "name": "海口派出所",
            "type": "police_station"
          },
          {
            "name": "大同派出所",
            "type": "police_station"
          },
          {
            "name": "造橋分駐所",
            "type": "substation"
          },
          {
            "name": "談文派出所",
            "type": "police_station"
          },
          {
            "name": "後龍分駐所",
            "type": "substation"
          },
          {
            "name": "新港派出所",
            "type": "police_station"
          },
          {
            "name": "大山派出所",
            "type": "police_station"
          },
          {
            "name": "外埔派出所",
            "type": "police_station"
          },
          {
            "name": "聯港派出所",
            "type": "police_station"
          },
          {
            "name": "南勢派出所",
            "type": "police_station"
          }
        ]
      },
      {
        "id": "苗栗縣-頭份分局",
        "name": "頭份分局",
        "type": "division",
        "districts": [
          "頭份市",
          "三灣鄉",
          "南庄鄉"
        ],
        "stations": [
          {
            "name": "頭份派出所",
            "type": "police_station"
          },
          {
            "name": "斗坪派出所",
            "type": "police_station"
          },
          {
            "name": "尖山派出所",
            "type": "police_station"
          },
          {
            "name": "三灣分駐所",
            "type": "substation"
          },
          {
            "name": "大河派出所",
            "type": "police_station"
          },
          {
            "name": "南庄分駐所",
            "type": "substation"
          },
          {
            "name": "南埔派出所",
            "type": "police_station"
          },
          {
            "name": "田美派出所",
            "type": "police_station"
          },
          {
            "name": "蓬萊派出所",
            "type": "police_station"
          },
          {
            "name": "東河派出所",
            "type": "police_station"
          },
          {
            "name": "陸家派出所",
            "type": "police_station"
          }
        ]
      },
      {
        "id": "苗栗縣-苗栗分局",
        "name": "苗栗分局",
        "type": "division",
        "districts": [
          "苗栗市",
          "頭屋鄉",
          "公館鄉",
          "銅鑼鄉",
          "三義鄉"
        ],
        "stations": [
          {
            "name": "北苗派出所",
            "type": "police_station"
          },
          {
            "name": "南苗派出所",
            "type": "police_station"
          },
          {
            "name": "文山派出所",
            "type": "police_station"
          },
          {
            "name": "頭屋分駐所",
            "type": "substation"
          },
          {
            "name": "明德派出所",
            "type": "police_station"
          },
          {
            "name": "公館分駐所",
            "type": "substation"
          },
          {
            "name": "鶴岡派出所",
            "type": "police_station"
          },
          {
            "name": "福基派出所",
            "type": "police_station"
          },
          {
            "name": "銅鑼分駐所",
            "type": "substation"
          },
          {
            "name": "雞隆派出所",
            "type": "police_station"
          },
          {
            "name": "三義分駐所",
            "type": "substation"
          },
          {
            "name": "龍騰派出所",
            "type": "police_station"
          },
          {
            "name": "鯉魚派出所",
            "type": "police_station"
          }
        ]
      },
      {
        "id": "苗栗縣-通霄分局",
        "name": "通霄分局",
        "type": "division",
        "districts": [
          "通霄鎮",
          "苑裡鎮",
          "西湖鄉"
        ],
        "stations": [
          {
            "name": "通霄派出所",
            "type": "police_station"
          },
          {
            "name": "五福派出所",
            "type": "police_station"
          },
          {
            "name": "中和派出所",
            "type": "police_station"
          },
          {
            "name": "埔口派出所",
            "type": "police_station"
          },
          {
            "name": "白沙派出所",
            "type": "police_station"
          },
          {
            "name": "烏眉派出所",
            "type": "police_station"
          },
          {
            "name": "苑裡分駐所",
            "type": "substation"
          },
          {
            "name": "山腳派出所",
            "type": "police_station"
          },
          {
            "name": "社苓派出所",
            "type": "police_station"
          },
          {
            "name": "西湖分駐所",
            "type": "substation"
          },
          {
            "name": "高湖派出所",
            "type": "police_station"
          }
        ]
      },
      {
        "id": "苗栗縣-大湖分局",
        "name": "大湖分局",
        "type": "division",
        "districts": [
          "大湖鄉",
          "獅潭鄉",
          "卓蘭鎮",
          "泰安鄉"
        ],
        "stations": [
          {
            "name": "大湖派出所",
            "type": "police_station"
          },
          {
            "name": "南湖派出所",
            "type": "police_station"
          },
          {
            "name": "校林派出所",
            "type": "police_station"
          },
          {
            "name": "獅潭分駐所",
            "type": "substation"
          },
          {
            "name": "百壽派出所",
            "type": "police_station"
          },
          {
            "name": "和興派出所",
            "type": "police_station"
          },
          {
            "name": "汶水派出所",
            "type": "police_station"
          },
          {
            "name": "卓蘭分駐所",
            "type": "substation"
          },
          {
            "name": "坪林派出所",
            "type": "police_station"
          },
          {
            "name": "泰安分駐所",
            "type": "substation"
          },
          {
            "name": "龍山派出所",
            "type": "police_station"
          },
          {
            "name": "大興派出所",
            "type": "police_station"
          },
          {
            "name": "中興派出所",
            "type": "police_station"
          },
          {
            "name": "象鼻派出所",
            "type": "police_station"
          },
          {
            "name": "大安派出所",
            "type": "police_station"
          },
          {
            "name": "梅園派出所",
            "type": "police_station"
          },
          {
            "name": "觀霧派出所",
            "type": "police_station"
          }
        ]
      }
    ]
  },
  {
    "county": "彰化縣",
    "divisions": [
      {
        "id": "彰化縣-彰化分局",
        "name": "彰化分局",
        "type": "division",
        "districts": [
          "彰化市",
          "芬園鄉",
          "花壇鄉"
        ],
        "stations": [
          {
            "name": "中正派出所",
            "type": "police_station"
          },
          {
            "name": "大埔派出所",
            "type": "police_station"
          },
          {
            "name": "民生路派出所",
            "type": "police_station"
          },
          {
            "name": "民族路派出所",
            "type": "police_station"
          },
          {
            "name": "八卦山派出所",
            "type": "police_station"
          },
          {
            "name": "莿桐派出所",
            "type": "police_station"
          },
          {
            "name": "泰和派出所",
            "type": "police_station"
          },
          {
            "name": "大竹派出所",
            "type": "police_station"
          },
          {
            "name": "快官派出所",
            "type": "police_station"
          },
          {
            "name": "芬園分駐所",
            "type": "substation"
          },
          {
            "name": "縣莊派出所",
            "type": "police_station"
          },
          {
            "name": "安山派出所",
            "type": "police_station"
          },
          {
            "name": "花壇分駐所",
            "type": "substation"
          },
          {
            "name": "三春派出所",
            "type": "police_station"
          }
        ]
      },
      {
        "id": "彰化縣-和美分局",
        "name": "和美分局",
        "type": "division",
        "districts": [
          "和美鎮",
          "伸港鄉",
          "線西鄉"
        ],
        "stations": [
          {
            "name": "和美派出所",
            "type": "police_station"
          },
          {
            "name": "大霞派出所",
            "type": "police_station"
          },
          {
            "name": "嘉犁派出所",
            "type": "police_station"
          },
          {
            "name": "中寮派出所",
            "type": "police_station"
          },
          {
            "name": "塗厝派出所",
            "type": "police_station"
          },
          {
            "name": "伸港分駐所",
            "type": "substation"
          },
          {
            "name": "線西分駐所",
            "type": "substation"
          }
        ]
      },
      {
        "id": "彰化縣-鹿港分局",
        "name": "鹿港分局",
        "type": "division",
        "districts": [
          "鹿港鎮",
          "福興鄉",
          "秀水鄉"
        ],
        "stations": [
          {
            "name": "鹿港派出所",
            "type": "police_station"
          },
          {
            "name": "和興派出所",
            "type": "police_station"
          },
          {
            "name": "海埔派出所",
            "type": "police_station"
          },
          {
            "name": "草港派出所",
            "type": "police_station"
          },
          {
            "name": "頂番派出所",
            "type": "police_station"
          },
          {
            "name": "福興分駐所",
            "type": "substation"
          },
          {
            "name": "洪堀派出所",
            "type": "police_station"
          },
          {
            "name": "外中派出所",
            "type": "police_station"
          },
          {
            "name": "秀水分駐所",
            "type": "substation"
          },
          {
            "name": "秀安派出所",
            "type": "police_station"
          },
          {
            "name": "馬鳴派出所",
            "type": "police_station"
          }
        ]
      },
      {
        "id": "彰化縣-員林分局",
        "name": "員林分局",
        "type": "division",
        "districts": [
          "員林市",
          "大村鄉",
          "永靖鄉"
        ],
        "stations": [
          {
            "name": "員林派出所",
            "type": "police_station"
          },
          {
            "name": "莒光派出所",
            "type": "police_station"
          },
          {
            "name": "東山派出所",
            "type": "police_station"
          },
          {
            "name": "林厝派出所",
            "type": "police_station"
          },
          {
            "name": "大村分駐所",
            "type": "substation"
          },
          {
            "name": "村上派出所",
            "type": "police_station"
          },
          {
            "name": "永靖分駐所",
            "type": "substation"
          },
          {
            "name": "同安派出所",
            "type": "police_station"
          }
        ]
      },
      {
        "id": "彰化縣-田中分局",
        "name": "田中分局",
        "type": "division",
        "districts": [
          "田中鎮",
          "二水鄉",
          "社頭鄉"
        ],
        "stations": [
          {
            "name": "田中派出所",
            "type": "police_station"
          },
          {
            "name": "內安派出所",
            "type": "police_station"
          },
          {
            "name": "二水分駐所",
            "type": "substation"
          },
          {
            "name": "源泉派出所",
            "type": "police_station"
          },
          {
            "name": "社頭分駐所",
            "type": "substation"
          },
          {
            "name": "朝興派出所",
            "type": "police_station"
          }
        ]
      },
      {
        "id": "彰化縣-溪湖分局",
        "name": "溪湖分局",
        "type": "division",
        "districts": [
          "溪湖鎮",
          "埔鹽鄉",
          "埔心鄉"
        ],
        "stations": [
          {
            "name": "溪湖派出所",
            "type": "police_station"
          },
          {
            "name": "媽厝派出所",
            "type": "police_station"
          },
          {
            "name": "埔鹽分駐所",
            "type": "substation"
          },
          {
            "name": "埔東派出所",
            "type": "police_station"
          },
          {
            "name": "埔心分駐所",
            "type": "substation"
          },
          {
            "name": "舊館派出所",
            "type": "police_station"
          }
        ]
      },
      {
        "id": "彰化縣-北斗分局",
        "name": "北斗分局",
        "type": "division",
        "districts": [
          "北斗鎮",
          "溪州鄉",
          "田尾鄉",
          "埤頭鄉"
        ],
        "stations": [
          {
            "name": "北斗派出所",
            "type": "police_station"
          },
          {
            "name": "溪州分駐所",
            "type": "substation"
          },
          {
            "name": "三條派出所",
            "type": "police_station"
          },
          {
            "name": "成功派出所",
            "type": "police_station"
          },
          {
            "name": "田尾分駐所",
            "type": "substation"
          },
          {
            "name": "陸豐派出所",
            "type": "police_station"
          },
          {
            "name": "埤頭分駐所",
            "type": "substation"
          },
          {
            "name": "中和派出所",
            "type": "police_station"
          }
        ]
      },
      {
        "id": "彰化縣-芳苑分局",
        "name": "芳苑分局",
        "type": "division",
        "districts": [
          "芳苑鄉",
          "二林鎮",
          "大城鄉",
          "竹塘鄉"
        ],
        "stations": [
          {
            "name": "芳苑派出所",
            "type": "police_station"
          },
          {
            "name": "路上派出所",
            "type": "police_station"
          },
          {
            "name": "王功派出所",
            "type": "police_station"
          },
          {
            "name": "草湖派出所",
            "type": "police_station"
          },
          {
            "name": "漢寶派出所",
            "type": "police_station"
          },
          {
            "name": "二林分駐所",
            "type": "substation"
          },
          {
            "name": "萬興派出所",
            "type": "police_station"
          },
          {
            "name": "原斗派出所",
            "type": "police_station"
          },
          {
            "name": "竹塘分駐所",
            "type": "substation"
          },
          {
            "name": "永安派出所",
            "type": "police_station"
          },
          {
            "name": "大城分駐所",
            "type": "substation"
          },
          {
            "name": "西港派出所",
            "type": "police_station"
          }
        ]
      }
    ]
  },
  {
    "county": "南投縣",
    "divisions": [
      {
        "id": "南投縣-草屯分局",
        "name": "草屯分局",
        "type": "division",
        "districts": [
          "草屯鎮",
          "中寮鄉"
        ],
        "stations": [
          {
            "name": "草屯派出所",
            "type": "police_station"
          },
          {
            "name": "中正派出所",
            "type": "police_station"
          },
          {
            "name": "上林派出所",
            "type": "police_station"
          },
          {
            "name": "復興派出所",
            "type": "police_station"
          },
          {
            "name": "新光派出所",
            "type": "police_station"
          },
          {
            "name": "豐城派出所",
            "type": "police_station"
          },
          {
            "name": "雙冬派出所",
            "type": "police_station"
          },
          {
            "name": "中寮分駐所",
            "type": "substation"
          },
          {
            "name": "爽文派出所",
            "type": "police_station"
          }
        ]
      },
      {
        "id": "南投縣-南投分局",
        "name": "南投分局",
        "type": "division",
        "districts": [
          "南投市",
          "名間鄉"
        ],
        "stations": [
          {
            "name": "南投派出所",
            "type": "police_station"
          },
          {
            "name": "半山派出所",
            "type": "police_station"
          },
          {
            "name": "鳳鳴派出所",
            "type": "police_station"
          },
          {
            "name": "名間分駐所",
            "type": "substation"
          },
          {
            "name": "新佳派出所",
            "type": "police_station"
          },
          {
            "name": "永和派出所",
            "type": "police_station"
          },
          {
            "name": "赤水派出所",
            "type": "police_station"
          },
          {
            "name": "崁峰派出所",
            "type": "police_station"
          }
        ]
      },
      {
        "id": "南投縣-中興分局",
        "name": "中興分局",
        "type": "division",
        "districts": [
          "南投市"
        ],
        "stations": [
          {
            "name": "中興派出所",
            "type": "police_station"
          },
          {
            "name": "永清派出所",
            "type": "police_station"
          },
          {
            "name": "光明派出所",
            "type": "police_station"
          },
          {
            "name": "府西派出所",
            "type": "police_station"
          }
        ]
      },
      {
        "id": "南投縣-埔里分局",
        "name": "埔里分局",
        "type": "division",
        "districts": [
          "埔里鎮",
          "國姓鄉"
        ],
        "stations": [
          {
            "name": "埔里派出所",
            "type": "police_station"
          },
          {
            "name": "愛蘭派出所",
            "type": "police_station"
          },
          {
            "name": "鯉潭派出所",
            "type": "police_station"
          },
          {
            "name": "隆生派出所",
            "type": "police_station"
          },
          {
            "name": "桃米派出所",
            "type": "police_station"
          },
          {
            "name": "合成派出所",
            "type": "police_station"
          },
          {
            "name": "史港派出所",
            "type": "police_station"
          },
          {
            "name": "國姓分駐所",
            "type": "substation"
          },
          {
            "name": "長壽派出所",
            "type": "police_station"
          },
          {
            "name": "長流派出所",
            "type": "police_station"
          },
          {
            "name": "梅林派出所",
            "type": "police_station"
          },
          {
            "name": "北山派出所",
            "type": "police_station"
          }
        ]
      },
      {
        "id": "南投縣-仁愛分局",
        "name": "仁愛分局",
        "type": "division",
        "districts": [
          "仁愛鄉"
        ],
        "stations": [
          {
            "name": "廬山派出所",
            "type": "police_station"
          },
          {
            "name": "榮興派出所",
            "type": "police_station"
          },
          {
            "name": "華崗派出所",
            "type": "police_station"
          },
          {
            "name": "翠巒派出所",
            "type": "police_station"
          },
          {
            "name": "望洋派出所",
            "type": "police_station"
          },
          {
            "name": "紅香派出所",
            "type": "police_station"
          },
          {
            "name": "瑞岩派出所",
            "type": "police_station"
          },
          {
            "name": "翠峰派出所",
            "type": "police_station"
          },
          {
            "name": "平靜派出所",
            "type": "police_station"
          },
          {
            "name": "春陽派出所",
            "type": "police_station"
          },
          {
            "name": "親愛派出所",
            "type": "police_station"
          },
          {
            "name": "武界派出所",
            "type": "police_station"
          },
          {
            "name": "過坑派出所",
            "type": "police_station"
          },
          {
            "name": "中原派出所",
            "type": "police_station"
          },
          {
            "name": "南豐派出所",
            "type": "police_station"
          },
          {
            "name": "霧社派出所",
            "type": "police_station"
          },
          {
            "name": "松崗派出所",
            "type": "police_station"
          }
        ]
      },
      {
        "id": "南投縣-集集分局",
        "name": "集集分局",
        "type": "division",
        "districts": [
          "集集鎮",
          "水里鄉",
          "魚池鄉"
        ],
        "stations": [
          {
            "name": "集集派出所",
            "type": "police_station"
          },
          {
            "name": "隘寮派出所",
            "type": "police_station"
          },
          {
            "name": "水裡分駐所",
            "type": "substation"
          },
          {
            "name": "車埕派出所",
            "type": "police_station"
          },
          {
            "name": "玉峰派出所",
            "type": "police_station"
          },
          {
            "name": "郡坑派出所",
            "type": "police_station"
          },
          {
            "name": "魚池分駐所",
            "type": "substation"
          },
          {
            "name": "德化派出所",
            "type": "police_station"
          },
          {
            "name": "頭社派出所",
            "type": "police_station"
          },
          {
            "name": "日月潭派出所",
            "type": "police_station"
          },
          {
            "name": "東光派出所",
            "type": "police_station"
          },
          {
            "name": "五城派出所",
            "type": "police_station"
          }
        ]
      },
      {
        "id": "南投縣-信義分局",
        "name": "信義分局",
        "type": "division",
        "districts": [
          "信義鄉"
        ],
        "stations": [
          {
            "name": "人倫派出所",
            "type": "police_station"
          },
          {
            "name": "久美派出所",
            "type": "police_station"
          },
          {
            "name": "和社派出所",
            "type": "police_station"
          },
          {
            "name": "東埔派出所",
            "type": "police_station"
          },
          {
            "name": "青雲派出所",
            "type": "police_station"
          },
          {
            "name": "信義派出所",
            "type": "police_station"
          },
          {
            "name": "新鄉派出所",
            "type": "police_station"
          },
          {
            "name": "潭南派出所",
            "type": "police_station"
          },
          {
            "name": "豐丘派出所",
            "type": "police_station"
          },
          {
            "name": "雙龍派出所",
            "type": "police_station"
          },
          {
            "name": "羅娜派出所",
            "type": "police_station"
          }
        ]
      },
      {
        "id": "南投縣-竹山分局",
        "name": "竹山分局",
        "type": "division",
        "districts": [
          "竹山鎮",
          "鹿谷鄉"
        ],
        "stations": [
          {
            "name": "竹山派出所",
            "type": "police_station"
          },
          {
            "name": "延平派出所",
            "type": "police_station"
          },
          {
            "name": "社寮派出所",
            "type": "police_station"
          },
          {
            "name": "中和派出所",
            "type": "police_station"
          },
          {
            "name": "桶頭派出所",
            "type": "police_station"
          },
          {
            "name": "瑞竹派出所",
            "type": "police_station"
          },
          {
            "name": "過溪派出所",
            "type": "police_station"
          },
          {
            "name": "頂林派出所",
            "type": "police_station"
          },
          {
            "name": "鹿谷分駐所",
            "type": "substation"
          },
          {
            "name": "秀峰派出所",
            "type": "police_station"
          },
          {
            "name": "竹林派出所",
            "type": "police_station"
          },
          {
            "name": "鳳凰派出所",
            "type": "police_station"
          },
          {
            "name": "溪頭派出所",
            "type": "police_station"
          }
        ]
      }
    ]
  },
  {
    "county": "雲林縣",
    "divisions": [
      {
        "id": "雲林縣-斗六分局",
        "name": "斗六分局",
        "type": "division",
        "districts": [
          "斗六市",
          "林內鄉",
          "莿桐鄉"
        ],
        "stations": [
          {
            "name": "斗六派出所",
            "type": "police_station"
          },
          {
            "name": "公正派出所",
            "type": "police_station"
          },
          {
            "name": "長平派出所",
            "type": "police_station"
          },
          {
            "name": "長安派出所",
            "type": "police_station"
          },
          {
            "name": "榴中派出所",
            "type": "police_station"
          },
          {
            "name": "梅林派出所",
            "type": "police_station"
          },
          {
            "name": "溝埧派出所",
            "type": "police_station"
          },
          {
            "name": "莿桐分駐所",
            "type": "substation"
          },
          {
            "name": "饒平派出所",
            "type": "police_station"
          },
          {
            "name": "林內分駐所",
            "type": "substation"
          },
          {
            "name": "重興派出所",
            "type": "police_station"
          }
        ]
      },
      {
        "id": "雲林縣-斗南分局",
        "name": "斗南分局",
        "type": "division",
        "districts": [
          "斗南鎮",
          "古坑鄉",
          "大埤鄉"
        ],
        "stations": [
          {
            "name": "斗南派出所",
            "type": "police_station"
          },
          {
            "name": "新光派出所",
            "type": "police_station"
          },
          {
            "name": "新崙派出所",
            "type": "police_station"
          },
          {
            "name": "四維派出所",
            "type": "police_station"
          },
          {
            "name": "建國派出所",
            "type": "police_station"
          },
          {
            "name": "大埤分駐所",
            "type": "substation"
          },
          {
            "name": "怡美派出所",
            "type": "police_station"
          },
          {
            "name": "古坑分駐所",
            "type": "substation"
          },
          {
            "name": "永光派出所",
            "type": "police_station"
          },
          {
            "name": "東和派出所",
            "type": "police_station"
          },
          {
            "name": "華山派出所",
            "type": "police_station"
          },
          {
            "name": "樟湖派出所",
            "type": "police_station"
          },
          {
            "name": "草嶺派出所",
            "type": "police_station"
          }
        ]
      },
      {
        "id": "雲林縣-虎尾分局",
        "name": "虎尾分局",
        "type": "division",
        "districts": [
          "虎尾鎮",
          "土庫鎮",
          "褒忠鄉",
          "元長鄉"
        ],
        "stations": [
          {
            "name": "虎尾派出所",
            "type": "police_station"
          },
          {
            "name": "埒內派出所",
            "type": "police_station"
          },
          {
            "name": "惠來派出所",
            "type": "police_station"
          },
          {
            "name": "東屯派出所",
            "type": "police_station"
          },
          {
            "name": "土庫分駐所",
            "type": "substation"
          },
          {
            "name": "馬光派出所",
            "type": "police_station"
          },
          {
            "name": "褒忠分駐所",
            "type": "substation"
          },
          {
            "name": "龍岩派出所",
            "type": "police_station"
          },
          {
            "name": "元長分駐所",
            "type": "substation"
          },
          {
            "name": "客厝派出所",
            "type": "police_station"
          },
          {
            "name": "鹿寮派出所",
            "type": "police_station"
          }
        ]
      },
      {
        "id": "雲林縣-西螺分局",
        "name": "西螺分局",
        "type": "division",
        "districts": [
          "西螺鎮",
          "二崙鄉",
          "崙背鄉"
        ],
        "stations": [
          {
            "name": "西螺派出所",
            "type": "police_station"
          },
          {
            "name": "埤源派出所",
            "type": "police_station"
          },
          {
            "name": "和心派出所",
            "type": "police_station"
          },
          {
            "name": "吳厝派出所",
            "type": "police_station"
          },
          {
            "name": "二崙分駐所",
            "type": "substation"
          },
          {
            "name": "永定派出所",
            "type": "police_station"
          },
          {
            "name": "油車派出所",
            "type": "police_station"
          },
          {
            "name": "崙背分駐所",
            "type": "substation"
          },
          {
            "name": "豐榮派出所",
            "type": "police_station"
          }
        ]
      },
      {
        "id": "雲林縣-臺西分局",
        "name": "臺西分局",
        "type": "division",
        "districts": [
          "臺西鄉",
          "東勢鄉",
          "麥寮鄉",
          "四湖鄉"
        ],
        "stations": [
          {
            "name": "臺西派出所",
            "type": "police_station"
          },
          {
            "name": "崙豐派出所",
            "type": "police_station"
          },
          {
            "name": "麥寮分駐所",
            "type": "substation"
          },
          {
            "name": "橋頭派出所",
            "type": "police_station"
          },
          {
            "name": "東勢分駐所",
            "type": "substation"
          },
          {
            "name": "安南派出所",
            "type": "police_station"
          },
          {
            "name": "四湖分駐所",
            "type": "substation"
          },
          {
            "name": "林厝派出所",
            "type": "police_station"
          },
          {
            "name": "三崙派出所",
            "type": "police_station"
          },
          {
            "name": "飛沙派出所",
            "type": "police_station"
          }
        ]
      },
      {
        "id": "雲林縣-北港分局",
        "name": "北港分局",
        "type": "division",
        "districts": [
          "北港鎮",
          "口湖鄉",
          "水林鄉"
        ],
        "stations": [
          {
            "name": "北港派出所",
            "type": "police_station"
          },
          {
            "name": "北辰派出所",
            "type": "police_station"
          },
          {
            "name": "好收派出所",
            "type": "police_station"
          },
          {
            "name": "水林分駐所",
            "type": "substation"
          },
          {
            "name": "宏仁派出所",
            "type": "police_station"
          },
          {
            "name": "土厝派出所",
            "type": "police_station"
          },
          {
            "name": "蔦松派出所",
            "type": "police_station"
          },
          {
            "name": "口湖分駐所",
            "type": "substation"
          },
          {
            "name": "宜梧派出所",
            "type": "police_station"
          },
          {
            "name": "金湖派出所",
            "type": "police_station"
          },
          {
            "name": "下崙派出所",
            "type": "police_station"
          }
        ]
      }
    ]
  },
  {
    "county": "嘉義市",
    "divisions": [
      {
        "id": "嘉義市-第一分局",
        "name": "第一分局",
        "type": "division",
        "districts": [
          "西區"
        ],
        "stations": [
          {
            "name": "北興派出所",
            "type": "police_station"
          },
          {
            "name": "北鎮派出所",
            "type": "police_station"
          },
          {
            "name": "長榮派出所",
            "type": "police_station"
          },
          {
            "name": "竹圍派出所",
            "type": "police_station"
          },
          {
            "name": "八掌派出所",
            "type": "police_station"
          }
        ]
      },
      {
        "id": "嘉義市-第二分局",
        "name": "第二分局",
        "type": "division",
        "districts": [
          "東區"
        ],
        "stations": [
          {
            "name": "興安派出所",
            "type": "police_station"
          },
          {
            "name": "新南派出所",
            "type": "police_station"
          },
          {
            "name": "南門派出所",
            "type": "police_station"
          },
          {
            "name": "北門派出所",
            "type": "police_station"
          },
          {
            "name": "公園派出所",
            "type": "police_station"
          },
          {
            "name": "長竹派出所",
            "type": "police_station"
          },
          {
            "name": "後湖派出所",
            "type": "police_station"
          }
        ]
      }
    ]
  },
  {
    "county": "嘉義縣",
    "divisions": [
      {
        "id": "嘉義縣-朴子分局",
        "name": "朴子分局",
        "type": "division",
        "districts": [
          "朴子市",
          "六腳鄉",
          "東石鄉"
        ],
        "stations": [
          {
            "name": "朴子派出所",
            "type": "police_station"
          },
          {
            "name": "松梅派出所",
            "type": "police_station"
          },
          {
            "name": "竹村派出所",
            "type": "police_station"
          },
          {
            "name": "大鄉派出所",
            "type": "police_station"
          },
          {
            "name": "雙溪派出所",
            "type": "police_station"
          },
          {
            "name": "六腳分駐所",
            "type": "substation"
          },
          {
            "name": "六家派出所",
            "type": "police_station"
          },
          {
            "name": "永竹派出所",
            "type": "police_station"
          },
          {
            "name": "六美派出所",
            "type": "police_station"
          },
          {
            "name": "北美派出所",
            "type": "police_station"
          },
          {
            "name": "東石分駐所",
            "type": "substation"
          },
          {
            "name": "下揖派出所",
            "type": "police_station"
          },
          {
            "name": "三江派出所",
            "type": "police_station"
          },
          {
            "name": "港墘派出所",
            "type": "police_station"
          },
          {
            "name": "龍崗派出所",
            "type": "police_station"
          }
        ]
      },
      {
        "id": "嘉義縣-布袋分局",
        "name": "布袋分局",
        "type": "division",
        "districts": [
          "布袋鎮",
          "義竹鄉"
        ],
        "stations": [
          {
            "name": "布袋派出所",
            "type": "police_station"
          },
          {
            "name": "過溝派出所",
            "type": "police_station"
          },
          {
            "name": "景山派出所",
            "type": "police_station"
          },
          {
            "name": "新塭派出所",
            "type": "police_station"
          },
          {
            "name": "義竹分駐所",
            "type": "substation"
          },
          {
            "name": "光榮派出所",
            "type": "police_station"
          },
          {
            "name": "新店派出所",
            "type": "police_station"
          },
          {
            "name": "過路派出所",
            "type": "police_station"
          }
        ]
      },
      {
        "id": "嘉義縣-水上分局",
        "name": "水上分局",
        "type": "division",
        "districts": [
          "水上鄉",
          "太保市",
          "鹿草鄉"
        ],
        "stations": [
          {
            "name": "水上派出所",
            "type": "police_station"
          },
          {
            "name": "南靖派出所",
            "type": "police_station"
          },
          {
            "name": "柳林派出所",
            "type": "police_station"
          },
          {
            "name": "中莊派出所",
            "type": "police_station"
          },
          {
            "name": "成功派出所",
            "type": "police_station"
          },
          {
            "name": "太保分駐所",
            "type": "substation"
          },
          {
            "name": "新埤派出所",
            "type": "police_station"
          },
          {
            "name": "南新派出所",
            "type": "police_station"
          },
          {
            "name": "鹿草分駐所",
            "type": "substation"
          },
          {
            "name": "後堀派出所",
            "type": "police_station"
          },
          {
            "name": "下潭派出所",
            "type": "police_station"
          }
        ]
      },
      {
        "id": "嘉義縣-竹崎分局",
        "name": "竹崎分局",
        "type": "division",
        "districts": [
          "竹崎鄉",
          "阿里山鄉",
          "梅山鄉"
        ],
        "stations": [
          {
            "name": "竹崎派出所",
            "type": "police_station"
          },
          {
            "name": "鹿滿派出所",
            "type": "police_station"
          },
          {
            "name": "內埔派出所",
            "type": "police_station"
          },
          {
            "name": "龍山派出所",
            "type": "police_station"
          },
          {
            "name": "復金派出所",
            "type": "police_station"
          },
          {
            "name": "仁和派出所",
            "type": "police_station"
          },
          {
            "name": "中和派出所",
            "type": "police_station"
          },
          {
            "name": "仁壽派出所",
            "type": "police_station"
          },
          {
            "name": "梅山分駐所",
            "type": "substation"
          },
          {
            "name": "大南派出所",
            "type": "police_station"
          },
          {
            "name": "太平派出所",
            "type": "police_station"
          },
          {
            "name": "瑞里派出所",
            "type": "police_station"
          },
          {
            "name": "太和派出所",
            "type": "police_station"
          },
          {
            "name": "樂野分駐所",
            "type": "substation"
          },
          {
            "name": "達邦派出所",
            "type": "police_station"
          },
          {
            "name": "里佳派出所",
            "type": "police_station"
          },
          {
            "name": "山美派出所",
            "type": "police_station"
          },
          {
            "name": "新美派出所",
            "type": "police_station"
          },
          {
            "name": "來吉派出所",
            "type": "police_station"
          },
          {
            "name": "十字派出所",
            "type": "police_station"
          },
          {
            "name": "阿里山派出所",
            "type": "police_station"
          }
        ]
      },
      {
        "id": "嘉義縣-中埔分局",
        "name": "中埔分局",
        "type": "division",
        "districts": [
          "中埔鄉",
          "大埔鄉",
          "番路鄉"
        ],
        "stations": [
          {
            "name": "中埔派出所",
            "type": "police_station"
          },
          {
            "name": "頂六派出所",
            "type": "police_station"
          },
          {
            "name": "義仁派出所",
            "type": "police_station"
          },
          {
            "name": "同仁派出所",
            "type": "police_station"
          },
          {
            "name": "東興派出所",
            "type": "police_station"
          },
          {
            "name": "三和派出所",
            "type": "police_station"
          },
          {
            "name": "石硦派出所",
            "type": "police_station"
          },
          {
            "name": "大埔分駐所",
            "type": "substation"
          },
          {
            "name": "番路分駐所",
            "type": "substation"
          },
          {
            "name": "觸口派出所",
            "type": "police_station"
          },
          {
            "name": "公田派出所",
            "type": "police_station"
          }
        ]
      },
      {
        "id": "嘉義縣-民雄分局",
        "name": "民雄分局",
        "type": "division",
        "districts": [
          "民雄鄉",
          "大林鎮",
          "新港鄉",
          "溪口鄉"
        ],
        "stations": [
          {
            "name": "民雄派出所",
            "type": "police_station"
          },
          {
            "name": "豐收派出所",
            "type": "police_station"
          },
          {
            "name": "民興派出所",
            "type": "police_station"
          },
          {
            "name": "菁埔派出所",
            "type": "police_station"
          },
          {
            "name": "北斗派出所",
            "type": "police_station"
          },
          {
            "name": "大林分駐所",
            "type": "substation"
          },
          {
            "name": "溝背派出所",
            "type": "police_station"
          },
          {
            "name": "大美派出所",
            "type": "police_station"
          },
          {
            "name": "新港分駐所",
            "type": "substation"
          },
          {
            "name": "南港派出所",
            "type": "police_station"
          },
          {
            "name": "月眉派出所",
            "type": "police_station"
          },
          {
            "name": "安和派出所",
            "type": "police_station"
          },
          {
            "name": "埤頭派出所",
            "type": "police_station"
          },
          {
            "name": "溪口分駐所",
            "type": "substation"
          },
          {
            "name": "柳溝派出所",
            "type": "police_station"
          }
        ]
      }
    ]
  },
  {
    "county": "屏東縣",
    "divisions": [
      {
        "id": "屏東縣-屏東分局",
        "name": "屏東分局",
        "type": "division",
        "districts": [
          "屏東市",
          "長治鄉",
          "麟洛鄉",
          "萬丹鄉"
        ],
        "stations": [
          {
            "name": "民和派出所",
            "type": "police_station"
          },
          {
            "name": "民生派出所",
            "type": "police_station"
          },
          {
            "name": "民族派出所",
            "type": "police_station"
          },
          {
            "name": "大同派出所",
            "type": "police_station"
          },
          {
            "name": "崇蘭派出所",
            "type": "police_station"
          },
          {
            "name": "建國派出所",
            "type": "police_station"
          },
          {
            "name": "歸來派出所",
            "type": "police_station"
          },
          {
            "name": "海豐派出所",
            "type": "police_station"
          },
          {
            "name": "公館派出所",
            "type": "police_station"
          },
          {
            "name": "萬丹分駐所",
            "type": "substation"
          },
          {
            "name": "社皮派出所",
            "type": "police_station"
          },
          {
            "name": "新鐘派出所",
            "type": "police_station"
          },
          {
            "name": "麟洛分駐所",
            "type": "substation"
          },
          {
            "name": "長治分駐所",
            "type": "substation"
          },
          {
            "name": "德協派出所",
            "type": "police_station"
          },
          {
            "name": "繁華派出所",
            "type": "police_station"
          }
        ]
      },
      {
        "id": "屏東縣-里港分局",
        "name": "里港分局",
        "type": "division",
        "districts": [
          "里港鄉",
          "九如鄉",
          "高樹鄉",
          "鹽埔鄉",
          "三地門鄉",
          "霧臺鄉"
        ],
        "stations": [
          {
            "name": "大平派出所",
            "type": "police_station"
          },
          {
            "name": "三和派出所",
            "type": "police_station"
          },
          {
            "name": "九如分駐所",
            "type": "substation"
          },
          {
            "name": "高樹分駐所",
            "type": "substation"
          },
          {
            "name": "泰山派出所",
            "type": "police_station"
          },
          {
            "name": "新南派出所",
            "type": "police_station"
          },
          {
            "name": "舊寮派出所",
            "type": "police_station"
          },
          {
            "name": "鹽埔分駐所",
            "type": "substation"
          },
          {
            "name": "新圍派出所",
            "type": "police_station"
          },
          {
            "name": "振興派出所",
            "type": "police_station"
          },
          {
            "name": "三地門分駐所",
            "type": "substation"
          },
          {
            "name": "口社派出所",
            "type": "police_station"
          },
          {
            "name": "德文派出所",
            "type": "police_station"
          },
          {
            "name": "霧臺分駐所",
            "type": "substation"
          }
        ]
      },
      {
        "id": "屏東縣-潮州分局",
        "name": "潮州分局",
        "type": "division",
        "districts": [
          "潮州鎮",
          "竹田鄉",
          "新埤鄉",
          "來義鄉"
        ],
        "stations": [
          {
            "name": "光華派出所",
            "type": "police_station"
          },
          {
            "name": "中山路派出所",
            "type": "police_station"
          },
          {
            "name": "四林派出所",
            "type": "police_station"
          },
          {
            "name": "竹田分駐所",
            "type": "substation"
          },
          {
            "name": "西勢派出所",
            "type": "police_station"
          },
          {
            "name": "泗洲派出所",
            "type": "police_station"
          },
          {
            "name": "新埤分駐所",
            "type": "substation"
          },
          {
            "name": "餉潭派出所",
            "type": "police_station"
          },
          {
            "name": "來義分駐所",
            "type": "substation"
          },
          {
            "name": "南和派出所",
            "type": "police_station"
          }
        ]
      },
      {
        "id": "屏東縣-內埔分局",
        "name": "內埔分局",
        "type": "division",
        "districts": [
          "內埔鄉",
          "萬巒鄉",
          "泰武鄉",
          "瑪家鄉"
        ],
        "stations": [
          {
            "name": "內埔派出所",
            "type": "police_station"
          },
          {
            "name": "龍泉派出所",
            "type": "police_station"
          },
          {
            "name": "新北勢派出所",
            "type": "police_station"
          },
          {
            "name": "萬巒分駐所",
            "type": "substation"
          },
          {
            "name": "佳佐派出所",
            "type": "police_station"
          },
          {
            "name": "赤山派出所",
            "type": "police_station"
          },
          {
            "name": "泰武分駐所",
            "type": "substation"
          },
          {
            "name": "忠孝派出所",
            "type": "police_station"
          },
          {
            "name": "瑪家分駐所",
            "type": "substation"
          },
          {
            "name": "佳義派出所",
            "type": "police_station"
          }
        ]
      },
      {
        "id": "屏東縣-枋寮分局",
        "name": "枋寮分局",
        "type": "division",
        "districts": [
          "枋寮鄉",
          "春日鄉",
          "枋山鄉",
          "獅子鄉",
          "佳冬鄉"
        ],
        "stations": [
          {
            "name": "枋寮派出所",
            "type": "police_station"
          },
          {
            "name": "建興派出所",
            "type": "police_station"
          },
          {
            "name": "東海派出所",
            "type": "police_station"
          },
          {
            "name": "佳冬分駐所",
            "type": "substation"
          },
          {
            "name": "石光派出所",
            "type": "police_station"
          },
          {
            "name": "枋山分駐所",
            "type": "substation"
          },
          {
            "name": "加祿派出所",
            "type": "police_station"
          },
          {
            "name": "楓港派出所",
            "type": "police_station"
          },
          {
            "name": "春日分駐所",
            "type": "substation"
          },
          {
            "name": "歸崇派出所",
            "type": "police_station"
          },
          {
            "name": "獅子分駐所",
            "type": "substation"
          },
          {
            "name": "內獅派出所",
            "type": "police_station"
          },
          {
            "name": "草埔派出所",
            "type": "police_station"
          }
        ]
      },
      {
        "id": "屏東縣-東港分局",
        "name": "東港分局",
        "type": "division",
        "districts": [
          "東港鎮",
          "林邊鄉",
          "南州鄉",
          "新園鄉",
          "崁頂鄉",
          "琉球鄉"
        ],
        "stations": [
          {
            "name": "東港派出所",
            "type": "police_station"
          },
          {
            "name": "東濱派出所",
            "type": "police_station"
          },
          {
            "name": "林邊分駐所",
            "type": "substation"
          },
          {
            "name": "南州分駐所",
            "type": "substation"
          },
          {
            "name": "崁頂分駐所",
            "type": "substation"
          },
          {
            "name": "琉球分駐所",
            "type": "substation"
          },
          {
            "name": "新園分駐所",
            "type": "substation"
          },
          {
            "name": "興龍派出所",
            "type": "police_station"
          }
        ]
      },
      {
        "id": "屏東縣-恆春分局",
        "name": "恆春分局",
        "type": "division",
        "districts": [
          "恆春鎮",
          "車城鄉",
          "滿州鄉",
          "牡丹鄉"
        ],
        "stations": [
          {
            "name": "建民派出所",
            "type": "police_station"
          },
          {
            "name": "仁壽派出所",
            "type": "police_station"
          },
          {
            "name": "墾丁派出所",
            "type": "police_station"
          },
          {
            "name": "龍水派出所",
            "type": "police_station"
          },
          {
            "name": "車城分駐所",
            "type": "substation"
          },
          {
            "name": "牡丹分駐所",
            "type": "substation"
          },
          {
            "name": "旭海派出所",
            "type": "police_station"
          },
          {
            "name": "滿州分駐所",
            "type": "substation"
          },
          {
            "name": "九棚派出所",
            "type": "police_station"
          },
          {
            "name": "長樂派出所",
            "type": "police_station"
          }
        ]
      }
    ]
  },
  {
    "county": "宜蘭縣",
    "divisions": [
      {
        "id": "宜蘭縣-宜蘭分局",
        "name": "宜蘭分局",
        "type": "division",
        "districts": [
          "宜蘭市",
          "員山鄉"
        ],
        "stations": [
          {
            "name": "新民派出所",
            "type": "police_station"
          },
          {
            "name": "民族派出所",
            "type": "police_station"
          },
          {
            "name": "新生派出所",
            "type": "police_station"
          },
          {
            "name": "進士派出所",
            "type": "police_station"
          },
          {
            "name": "延平派出所",
            "type": "police_station"
          },
          {
            "name": "員山分駐所",
            "type": "substation"
          },
          {
            "name": "枕山派出所",
            "type": "police_station"
          },
          {
            "name": "大湖派出所",
            "type": "police_station"
          },
          {
            "name": "惠好派出所",
            "type": "police_station"
          },
          {
            "name": "內城派出所",
            "type": "police_station"
          }
        ]
      },
      {
        "id": "宜蘭縣-礁溪分局",
        "name": "礁溪分局",
        "type": "division",
        "districts": [
          "礁溪鄉",
          "壯圍鄉",
          "頭城鎮"
        ],
        "stations": [
          {
            "name": "礁溪派出所",
            "type": "police_station"
          },
          {
            "name": "三城派出所",
            "type": "police_station"
          },
          {
            "name": "四城派出所",
            "type": "police_station"
          },
          {
            "name": "龍潭派出所",
            "type": "police_station"
          },
          {
            "name": "壯圍分駐所",
            "type": "substation"
          },
          {
            "name": "忠孝派出所",
            "type": "police_station"
          },
          {
            "name": "美城派出所",
            "type": "police_station"
          },
          {
            "name": "大福派出所",
            "type": "police_station"
          },
          {
            "name": "頭城分駐所",
            "type": "substation"
          },
          {
            "name": "二城派出所",
            "type": "police_station"
          },
          {
            "name": "福成派出所",
            "type": "police_station"
          },
          {
            "name": "大溪派出所",
            "type": "police_station"
          },
          {
            "name": "大里派出所",
            "type": "police_station"
          }
        ]
      },
      {
        "id": "宜蘭縣-羅東分局",
        "name": "羅東分局",
        "type": "division",
        "districts": [
          "羅東鎮",
          "五結鄉",
          "冬山鄉"
        ],
        "stations": [
          {
            "name": "公正派出所",
            "type": "police_station"
          },
          {
            "name": "成功派出所",
            "type": "police_station"
          },
          {
            "name": "開羅派出所",
            "type": "police_station"
          },
          {
            "name": "五結分駐所",
            "type": "substation"
          },
          {
            "name": "二結派出所",
            "type": "police_station"
          },
          {
            "name": "利澤派出所",
            "type": "police_station"
          },
          {
            "name": "冬山分駐所",
            "type": "substation"
          },
          {
            "name": "順安派出所",
            "type": "police_station"
          },
          {
            "name": "廣興派出所",
            "type": "police_station"
          }
        ]
      },
      {
        "id": "宜蘭縣-三星分局",
        "name": "三星分局",
        "type": "division",
        "districts": [
          "三星鄉",
          "大同鄉"
        ],
        "stations": [
          {
            "name": "三星派出所",
            "type": "police_station"
          },
          {
            "name": "大隱派出所",
            "type": "police_station"
          },
          {
            "name": "大洲派出所",
            "type": "police_station"
          },
          {
            "name": "福山派出所",
            "type": "police_station"
          },
          {
            "name": "大同分駐所",
            "type": "substation"
          },
          {
            "name": "英士派出所",
            "type": "police_station"
          },
          {
            "name": "牛鬥派出所",
            "type": "police_station"
          },
          {
            "name": "寒溪派出所",
            "type": "police_station"
          },
          {
            "name": "明池派出所",
            "type": "police_station"
          },
          {
            "name": "四季派出所",
            "type": "police_station"
          },
          {
            "name": "南山派出所",
            "type": "police_station"
          },
          {
            "name": "太平山派出所",
            "type": "police_station"
          }
        ]
      },
      {
        "id": "宜蘭縣-蘇澳分局",
        "name": "蘇澳分局",
        "type": "division",
        "districts": [
          "蘇澳鎮",
          "南澳鄉"
        ],
        "stations": [
          {
            "name": "蘇澳派出所",
            "type": "police_station"
          },
          {
            "name": "南方澳派出所",
            "type": "police_station"
          },
          {
            "name": "馬賽派出所",
            "type": "police_station"
          },
          {
            "name": "新城派出所",
            "type": "police_station"
          },
          {
            "name": "港邊派出所",
            "type": "police_station"
          },
          {
            "name": "東澳派出所",
            "type": "police_station"
          },
          {
            "name": "南澳分駐所",
            "type": "substation"
          },
          {
            "name": "碧候派出所",
            "type": "police_station"
          },
          {
            "name": "金岳派出所",
            "type": "police_station"
          },
          {
            "name": "武塔派出所",
            "type": "police_station"
          },
          {
            "name": "金洋派出所",
            "type": "police_station"
          },
          {
            "name": "澳花派出所",
            "type": "police_station"
          }
        ]
      }
    ]
  },
  {
    "county": "花蓮縣",
    "divisions": [
      {
        "id": "花蓮縣-花蓮分局",
        "name": "花蓮分局",
        "type": "division",
        "districts": [
          "花蓮市"
        ],
        "stations": [
          {
            "name": "軒轅派出所",
            "type": "police_station"
          },
          {
            "name": "中山派出所",
            "type": "police_station"
          },
          {
            "name": "中正派出所",
            "type": "police_station"
          },
          {
            "name": "中華派出所",
            "type": "police_station"
          },
          {
            "name": "美崙派出所",
            "type": "police_station"
          },
          {
            "name": "民意派出所",
            "type": "police_station"
          },
          {
            "name": "豐川派出所",
            "type": "police_station"
          },
          {
            "name": "自強派出所",
            "type": "police_station"
          }
        ]
      },
      {
        "id": "花蓮縣-新城分局",
        "name": "新城分局",
        "type": "division",
        "districts": [
          "新城鄉",
          "秀林鄉"
        ],
        "stations": [
          {
            "name": "新城派出所",
            "type": "police_station"
          },
          {
            "name": "北埔派出所",
            "type": "police_station"
          },
          {
            "name": "嘉里派出所",
            "type": "police_station"
          },
          {
            "name": "佳民派出所",
            "type": "police_station"
          },
          {
            "name": "加灣派出所",
            "type": "police_station"
          },
          {
            "name": "秀林分駐所",
            "type": "substation"
          },
          {
            "name": "富世派出所",
            "type": "police_station"
          },
          {
            "name": "崇德派出所",
            "type": "police_station"
          },
          {
            "name": "和平派出所",
            "type": "police_station"
          },
          {
            "name": "天祥派出所",
            "type": "police_station"
          },
          {
            "name": "合歡派出所",
            "type": "police_station"
          }
        ]
      },
      {
        "id": "花蓮縣-吉安分局",
        "name": "吉安分局",
        "type": "division",
        "districts": [
          "吉安鄉",
          "壽豐鄉"
        ],
        "stations": [
          {
            "name": "仁里派出所",
            "type": "police_station"
          },
          {
            "name": "光華派出所",
            "type": "police_station"
          },
          {
            "name": "北昌派出所",
            "type": "police_station"
          },
          {
            "name": "太昌派出所",
            "type": "police_station"
          },
          {
            "name": "吉安派出所",
            "type": "police_station"
          },
          {
            "name": "稻香派出所",
            "type": "police_station"
          },
          {
            "name": "南華派出所",
            "type": "police_station"
          },
          {
            "name": "志學派出所",
            "type": "police_station"
          },
          {
            "name": "壽豐分駐所",
            "type": "substation"
          },
          {
            "name": "豐田派出所",
            "type": "police_station"
          },
          {
            "name": "月眉派出所",
            "type": "police_station"
          },
          {
            "name": "鹽寮派出所",
            "type": "police_station"
          },
          {
            "name": "水璉派出所",
            "type": "police_station"
          },
          {
            "name": "池南派出所",
            "type": "police_station"
          },
          {
            "name": "水源派出所",
            "type": "police_station"
          },
          {
            "name": "銅門派出所",
            "type": "police_station"
          }
        ]
      },
      {
        "id": "花蓮縣-鳳林分局",
        "name": "鳳林分局",
        "type": "division",
        "districts": [
          "鳳林鎮",
          "光復鄉",
          "瑞穗鄉",
          "豐濱鄉",
          "萬榮鄉"
        ],
        "stations": [
          {
            "name": "鳳林派出所",
            "type": "police_station"
          },
          {
            "name": "南平派出所",
            "type": "police_station"
          },
          {
            "name": "山興派出所",
            "type": "police_station"
          },
          {
            "name": "長橋派出所",
            "type": "police_station"
          },
          {
            "name": "萬榮分駐所",
            "type": "substation"
          },
          {
            "name": "西林派出所",
            "type": "police_station"
          },
          {
            "name": "紅葉派出所",
            "type": "police_station"
          },
          {
            "name": "光復分駐所",
            "type": "substation"
          },
          {
            "name": "富田派出所",
            "type": "police_station"
          },
          {
            "name": "大富派出所",
            "type": "police_station"
          },
          {
            "name": "富源派出所",
            "type": "police_station"
          },
          {
            "name": "瑞穗分駐所",
            "type": "substation"
          },
          {
            "name": "舞鶴派出所",
            "type": "police_station"
          },
          {
            "name": "奇美派出所",
            "type": "police_station"
          },
          {
            "name": "豐濱分駐所",
            "type": "substation"
          },
          {
            "name": "新社派出所",
            "type": "police_station"
          },
          {
            "name": "港口派出所",
            "type": "police_station"
          }
        ]
      },
      {
        "id": "花蓮縣-玉里分局",
        "name": "玉里分局",
        "type": "division",
        "districts": [
          "玉里鎮",
          "富里鄉",
          "卓溪鄉"
        ],
        "stations": [
          {
            "name": "玉里派出所",
            "type": "police_station"
          },
          {
            "name": "大禹派出所",
            "type": "police_station"
          },
          {
            "name": "三民派出所",
            "type": "police_station"
          },
          {
            "name": "春日派出所",
            "type": "police_station"
          },
          {
            "name": "觀音派出所",
            "type": "police_station"
          },
          {
            "name": "樂合派出所",
            "type": "police_station"
          },
          {
            "name": "東里派出所",
            "type": "police_station"
          },
          {
            "name": "竹田派出所",
            "type": "police_station"
          },
          {
            "name": "富里分駐所",
            "type": "substation"
          },
          {
            "name": "永豐派出所",
            "type": "police_station"
          },
          {
            "name": "立山派出所",
            "type": "police_station"
          },
          {
            "name": "中平派出所",
            "type": "police_station"
          },
          {
            "name": "卓溪分駐所",
            "type": "substation"
          },
          {
            "name": "卓樂派出所",
            "type": "police_station"
          },
          {
            "name": "崙天派出所",
            "type": "police_station"
          }
        ]
      }
    ]
  },
  {
    "county": "臺東縣",
    "divisions": [
      {
        "id": "臺東縣-臺東分局",
        "name": "臺東分局",
        "type": "division",
        "districts": [
          "臺東市",
          "蘭嶼鄉",
          "綠島鄉",
          "卑南鄉"
        ],
        "stations": [
          {
            "name": "中興派出所",
            "type": "police_station"
          },
          {
            "name": "溫泉派出所",
            "type": "police_station"
          },
          {
            "name": "東興派出所",
            "type": "police_station"
          },
          {
            "name": "寶桑派出所",
            "type": "police_station"
          },
          {
            "name": "豐里派出所",
            "type": "police_station"
          },
          {
            "name": "富岡派出所",
            "type": "police_station"
          },
          {
            "name": "馬蘭派出所",
            "type": "police_station"
          },
          {
            "name": "南王派出所",
            "type": "police_station"
          },
          {
            "name": "知本派出所",
            "type": "police_station"
          },
          {
            "name": "永樂派出所",
            "type": "police_station"
          },
          {
            "name": "蘭嶼分駐所",
            "type": "substation"
          },
          {
            "name": "建蘭派出所",
            "type": "police_station"
          },
          {
            "name": "東清派出所",
            "type": "police_station"
          },
          {
            "name": "朗島派出所",
            "type": "police_station"
          },
          {
            "name": "綠島分駐所",
            "type": "substation"
          },
          {
            "name": "公館派出所",
            "type": "police_station"
          },
          {
            "name": "卑南分駐所",
            "type": "substation"
          },
          {
            "name": "利嘉派出所",
            "type": "police_station"
          },
          {
            "name": "初鹿派出所",
            "type": "police_station"
          }
        ]
      },
      {
        "id": "臺東縣-大武分局",
        "name": "大武分局",
        "type": "division",
        "districts": [
          "大武鄉",
          "太麻里鄉",
          "達仁鄉",
          "金峰鄉"
        ],
        "stations": [
          {
            "name": "大武派出所",
            "type": "police_station"
          },
          {
            "name": "尚武派出所",
            "type": "police_station"
          },
          {
            "name": "太麻里分駐所",
            "type": "substation"
          },
          {
            "name": "美和派出所",
            "type": "police_station"
          },
          {
            "name": "金崙派出所",
            "type": "police_station"
          },
          {
            "name": "多良派出所",
            "type": "police_station"
          },
          {
            "name": "達仁分駐所",
            "type": "substation"
          },
          {
            "name": "新化派出所",
            "type": "police_station"
          },
          {
            "name": "森永派出所",
            "type": "police_station"
          },
          {
            "name": "臺坂派出所",
            "type": "police_station"
          },
          {
            "name": "土坂派出所",
            "type": "police_station"
          },
          {
            "name": "金峰分駐所",
            "type": "substation"
          },
          {
            "name": "正興派出所",
            "type": "police_station"
          }
        ]
      },
      {
        "id": "臺東縣-關山分局",
        "name": "關山分局",
        "type": "division",
        "districts": [
          "關山鎮",
          "池上鄉",
          "海端鄉",
          "鹿野鄉",
          "延平鄉"
        ],
        "stations": [
          {
            "name": "關山派出所",
            "type": "police_station"
          },
          {
            "name": "電光派出所",
            "type": "police_station"
          },
          {
            "name": "池上分駐所",
            "type": "substation"
          },
          {
            "name": "錦安派出所",
            "type": "police_station"
          },
          {
            "name": "海端分駐所",
            "type": "substation"
          },
          {
            "name": "霧鹿派出所",
            "type": "police_station"
          },
          {
            "name": "龍泉派出所",
            "type": "police_station"
          },
          {
            "name": "崁頂派出所",
            "type": "police_station"
          },
          {
            "name": "初來派出所",
            "type": "police_station"
          },
          {
            "name": "利稻派出所",
            "type": "police_station"
          },
          {
            "name": "向陽派出所",
            "type": "police_station"
          },
          {
            "name": "鹿野分駐所",
            "type": "substation"
          },
          {
            "name": "瑞源派出所",
            "type": "police_station"
          },
          {
            "name": "瑞豐派出所",
            "type": "police_station"
          },
          {
            "name": "延平分駐所",
            "type": "substation"
          },
          {
            "name": "鸞山派出所",
            "type": "police_station"
          },
          {
            "name": "武陵派出所",
            "type": "police_station"
          }
        ]
      },
      {
        "id": "臺東縣-成功分局",
        "name": "成功分局",
        "type": "division",
        "districts": [
          "成功鎮",
          "東河鄉",
          "長濱鄉"
        ],
        "stations": [
          {
            "name": "新豐派出所",
            "type": "police_station"
          },
          {
            "name": "忠孝派出所",
            "type": "police_station"
          },
          {
            "name": "都歷派出所",
            "type": "police_station"
          },
          {
            "name": "東河分駐所",
            "type": "substation"
          },
          {
            "name": "泰源派出所",
            "type": "police_station"
          },
          {
            "name": "都蘭派出所",
            "type": "police_station"
          },
          {
            "name": "長濱分駐所",
            "type": "substation"
          },
          {
            "name": "樟原派出所",
            "type": "police_station"
          },
          {
            "name": "三間派出所",
            "type": "police_station"
          },
          {
            "name": "竹湖派出所",
            "type": "police_station"
          },
          {
            "name": "寧埔派出所",
            "type": "police_station"
          }
        ]
      }
    ]
  },
  {
    "county": "澎湖縣",
    "divisions": [
      {
        "id": "澎湖縣-馬公分局",
        "name": "馬公分局",
        "type": "division",
        "districts": [
          "馬公市",
          "湖西鄉"
        ],
        "stations": [
          {
            "name": "光明派出所",
            "type": "police_station"
          },
          {
            "name": "啟明派出所",
            "type": "police_station"
          },
          {
            "name": "文澳派出所",
            "type": "police_station"
          },
          {
            "name": "東衛派出所",
            "type": "police_station"
          },
          {
            "name": "鎖港派出所",
            "type": "police_station"
          },
          {
            "name": "虎井派出所",
            "type": "police_station"
          },
          {
            "name": "桶盤派出所",
            "type": "police_station"
          },
          {
            "name": "沙港派出所",
            "type": "police_station"
          },
          {
            "name": "隘門派出所",
            "type": "police_station"
          },
          {
            "name": "西溪派出所",
            "type": "police_station"
          },
          {
            "name": "湖西分駐所",
            "type": "substation"
          },
          {
            "name": "龍門派出所",
            "type": "police_station"
          }
        ]
      },
      {
        "id": "澎湖縣-白沙分局",
        "name": "白沙分局",
        "type": "division",
        "districts": [
          "白沙鄉",
          "西嶼鄉"
        ],
        "stations": [
          {
            "name": "白沙派出所",
            "type": "police_station"
          },
          {
            "name": "講美派出所",
            "type": "police_station"
          },
          {
            "name": "通樑派出所",
            "type": "police_station"
          },
          {
            "name": "吉貝派出所",
            "type": "police_station"
          },
          {
            "name": "鳥嶼駐在所",
            "type": "post"
          },
          {
            "name": "員貝駐在所",
            "type": "post"
          },
          {
            "name": "大倉駐在所",
            "type": "post"
          },
          {
            "name": "西嶼分駐所",
            "type": "substation"
          },
          {
            "name": "竹灣派出所",
            "type": "police_station"
          },
          {
            "name": "外垵派出所",
            "type": "police_station"
          }
        ]
      },
      {
        "id": "澎湖縣-望安分局",
        "name": "望安分局",
        "type": "division",
        "districts": [
          "望安鄉",
          "七美鄉"
        ],
        "stations": [
          {
            "name": "東垵派出所",
            "type": "police_station"
          },
          {
            "name": "水垵派出所",
            "type": "police_station"
          },
          {
            "name": "將軍派出所",
            "type": "police_station"
          },
          {
            "name": "嶼坪派出所",
            "type": "police_station"
          },
          {
            "name": "花嶼派出所",
            "type": "police_station"
          },
          {
            "name": "雙吉派出所",
            "type": "police_station"
          },
          {
            "name": "七美分駐所",
            "type": "substation"
          }
        ]
      }
    ]
  },
  {
    "county": "金門縣",
    "divisions": [
      {
        "id": "金門縣-金城分局",
        "name": "金城分局",
        "type": "division",
        "districts": [
          "金城鎮",
          "金寧鄉",
          "烈嶼鄉"
        ],
        "stations": [
          {
            "name": "金城派出所",
            "type": "police_station"
          },
          {
            "name": "金寧分駐所",
            "type": "substation"
          },
          {
            "name": "烈嶼分駐所",
            "type": "substation"
          },
          {
            "name": "大二膽派出所",
            "type": "police_station"
          }
        ]
      },
      {
        "id": "金門縣-金湖分局",
        "name": "金湖分局",
        "type": "division",
        "districts": [
          "金湖鎮",
          "金沙鎮",
          "烏坵鄉"
        ],
        "stations": [
          {
            "name": "金湖派出所",
            "type": "police_station"
          },
          {
            "name": "金沙分駐所",
            "type": "substation"
          },
          {
            "name": "烏坵駐在所",
            "type": "post"
          }
        ]
      }
    ]
  },
  {
    "county": "連江縣",
    "divisions": [
      {
        "id": "連江縣-南竿警察所",
        "name": "南竿警察所",
        "type": "police_office",
        "districts": [
          "南竿鄉"
        ],
        "stations": [
          {
            "name": "西區派出所",
            "type": "police_station"
          }
        ]
      },
      {
        "id": "連江縣-北竿警察所",
        "name": "北竿警察所",
        "type": "police_office",
        "districts": [
          "北竿鄉"
        ],
        "stations": []
      },
      {
        "id": "連江縣-東引警察所",
        "name": "東引警察所",
        "type": "police_office",
        "districts": [
          "東引鄉"
        ],
        "stations": []
      },
      {
        "id": "連江縣-莒光警察所",
        "name": "莒光警察所",
        "type": "police_office",
        "districts": [
          "莒光鄉"
        ],
        "stations": [
          {
            "name": "東莒派出所",
            "type": "police_station"
          }
        ]
      }
    ]
  }
];

export const POLICE_ORGANIZATION_VERSION = 1;

// Districts that are genuinely split between two divisions. Array order in
// POLICE_ORGANIZATION must NEVER decide these - a district listed here is
// resolved by an explicit rule, and when the rule cannot be applied the
// resolver reports an ambiguous jurisdiction instead of silently picking one.
//
// `jurisdictionText` is the agency's own description of the division's
// jurisdiction, transcribed verbatim from the public 中華民國警察分局列表
// (see the provenance note at the top of this file). It is recorded so the
// rule below can be audited against the official wording, and so whoever
// later obtains the enumerated 里 lists (or boundary polygons) knows exactly
// which text they need to satisfy.
//
// Rule types:
//   'village-list' - the official jurisdiction enumerates the villages (里)
//     of one division and defines the other as "everything else" in the
//     district. Fully deterministic once a village is known.
//   'boundary-unavailable' - the official jurisdiction is defined by a
//     village count or a sub-district area name whose enumerated member list
//     is not published in any source shipped with this app. CIBAR cannot
//     resolve these from county+district alone, and its GPS layer is a
//     county-centroid nearest match (RegionAgencyResolver.resolveCoordinateToRegion),
//     which cannot separate two jurisdictions inside one district either.
//     These resolve to `ambiguousDefaultDivisionId` and are reported as
//     ambiguous - never as "resolved from location".
//
// `ambiguousDefaultDivisionId` is an explicit, documented choice (the
// division covering the district's historic administrative core, i.e. the
// one whose jurisdiction text names the district centre or that carries the
// lower ordinal), not the first entry of an array.
export const SPLIT_JURISDICTIONS = {
  '臺北市/中正區': {
    candidates: ['臺北市-中正第一分局', '臺北市-中正第二分局'],
    jurisdictionText: {
      '臺北市-中正第一分局': '中正區城中（轄管博愛特區）',
      '臺北市-中正第二分局': '中正區古亭',
    },
    rule: { type: 'boundary-unavailable', missing: '城中／古亭兩區塊的里別清單' },
    ambiguousDefaultDivisionId: '臺北市-中正第一分局',
  },
  '臺北市/文山區': {
    candidates: ['臺北市-文山第一分局', '臺北市-文山第二分局'],
    jurisdictionText: {
      '臺北市-文山第一分局': '文山區木柵',
      '臺北市-文山第二分局': '文山區景美',
    },
    rule: { type: 'boundary-unavailable', missing: '木柵／景美兩區塊的里別清單' },
    ambiguousDefaultDivisionId: '臺北市-文山第一分局',
  },
  '新北市/板橋區': {
    candidates: ['新北市-板橋分局', '新北市-海山分局'],
    jurisdictionText: {
      '新北市-板橋分局': '板橋區西南56個里',
      '新北市-海山分局': '板橋區東北70個里',
    },
    rule: { type: 'boundary-unavailable', missing: '西南56里／東北70里的里別清單' },
    ambiguousDefaultDivisionId: '新北市-板橋分局',
  },
  '高雄市/三民區': {
    candidates: ['高雄市-三民第一分局', '高雄市-三民第二分局'],
    jurisdictionText: {
      '高雄市-三民第一分局': '三民區西側41個里',
      '高雄市-三民第二分局': '三民區東側45個里',
    },
    rule: { type: 'boundary-unavailable', missing: '西側41里／東側45里的里別清單' },
    ambiguousDefaultDivisionId: '高雄市-三民第一分局',
  },
  // The one split whose official jurisdiction IS enumerated: 中興分局 covers
  // 中興新村's eight 里 by name, and 南投分局 covers 南投市「中興新村除外」-
  // so the "everything else" branch is authoritative too, not a guess.
  '南投縣/南投市': {
    candidates: ['南投縣-南投分局', '南投縣-中興分局'],
    jurisdictionText: {
      '南投縣-南投分局': '南投市（中興新村除外）',
      '南投縣-中興分局': '南投市中興新村（光輝里、光華里、光榮里、光明里、營北里、營南里、內新里、內興里）',
    },
    rule: {
      type: 'village-list',
      villages: {
        '南投縣-中興分局': ['光輝里', '光華里', '光榮里', '光明里', '營北里', '營南里', '內新里', '內興里'],
      },
      remainderDivisionId: '南投縣-南投分局',
    },
    ambiguousDefaultDivisionId: '南投縣-南投分局',
  },
};
