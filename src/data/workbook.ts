import type { Project } from '../types'

/** Transcribed from EMAS-EPCC-EXE-CHRM-66-ELE-CAL-1007-Attachment 1.xlsx (sheet "EMAS DC UPS"). */

export const workbookProject: Project = 
{
  "meta": {
    "title": "DC UPS Sizing Workbench",
    "project": "Engineering, Procurement, Construction and Commissioning of Effluent Management at Source (EMAS) Project",
    "subject": "DC UPS Load List Summary and Battery Sizing",
    "docNo": "EMAS-EPCC-EXE-CHRM-66-ELE-CAL-1007",
    "revision": "A",
    "client": "EMAS Project",
    "preparedBy": "Electrical Engineering",
    "discipline": "Electrical — DC Systems",
    "date": "2026-11-26"
  },
  "systems": [
    {
      "code": "1",
      "name": "6.6kV SWITCHGEAR (19-PSW4-001)",
      "doc": null,
      "note": null,
      "items": [],
      "sections": [
        {
          "code": "1.1",
          "name": "INCOMER",
          "items": [
            {
              "code": "1.1.1",
              "description": "Closing Coil/Tripping Coil",
              "qty": 2,
              "watt": 495,
              "active": {
                "boc": 0,
                "cont": 0,
                "eod": 1
              },
              "remark": "1 incomer considered",
              "id": "sys-1-s1-i1"
            },
            {
              "code": "1.1.2",
              "description": "Auxiliary Relays (Omron/LY4N)",
              "qty": 2,
              "watt": 10.5,
              "active": {
                "boc": 0,
                "cont": 2,
                "eod": 0
              },
              "remark": null,
              "id": "sys-1-s1-i2"
            },
            {
              "code": "1.1.3",
              "description": "VCB Indicating Light",
              "qty": 2,
              "watt": 2,
              "active": {
                "boc": 0,
                "cont": 2,
                "eod": 0
              },
              "remark": null,
              "id": "sys-1-s1-i3"
            },
            {
              "code": "1.1.4",
              "description": "Semaphore Indicator (Fuji)",
              "qty": 2,
              "watt": 1.5,
              "active": {
                "boc": 2,
                "cont": 0,
                "eod": 0
              },
              "remark": null,
              "id": "sys-1-s1-i4"
            },
            {
              "code": "1.1.5",
              "description": "OC/EF Protection Relay (Schneider/P3T32)",
              "qty": 2,
              "watt": 28,
              "active": {
                "boc": 0,
                "cont": 0,
                "eod": 2
              },
              "remark": null,
              "id": "sys-1-s1-i5"
            },
            {
              "code": "1.1.6",
              "description": "Line Differential Relay (Schneider/P3L30)",
              "qty": 2,
              "watt": 28,
              "active": {
                "boc": 0,
                "cont": 2,
                "eod": 0
              },
              "remark": null,
              "id": "sys-1-s1-i6"
            },
            {
              "code": "1.1.7",
              "description": "Lock out relay (Arteche/8J-8RP)",
              "qty": 2,
              "watt": 30,
              "active": {
                "boc": 0,
                "cont": 0,
                "eod": 0
              },
              "remark": "Only operate during fault. Hence not considered.",
              "id": "sys-1-s1-i7"
            }
          ],
          "id": "sys-1-s1"
        },
        {
          "code": "1.2",
          "name": "BUS COUPLER",
          "items": [
            {
              "code": "1.1.1",
              "description": "Closing Coil/Tripping Coil",
              "qty": 1,
              "watt": 495,
              "active": {
                "boc": 0,
                "cont": 0,
                "eod": 1
              },
              "remark": null,
              "id": "sys-1-s2-i1"
            },
            {
              "code": "1.1.2",
              "description": "Auxiliary Relays (Omron/LY4N)",
              "qty": 1,
              "watt": 10.5,
              "active": {
                "boc": 0,
                "cont": 1,
                "eod": 0
              },
              "remark": null,
              "id": "sys-1-s2-i2"
            },
            {
              "code": "1.1.3",
              "description": "VCB Indicating Light",
              "qty": 1,
              "watt": 2,
              "active": {
                "boc": 0,
                "cont": 1,
                "eod": 0
              },
              "remark": null,
              "id": "sys-1-s2-i3"
            },
            {
              "code": "1.1.4",
              "description": "Semaphore Indicator (Fuji)",
              "qty": 1,
              "watt": 1.5,
              "active": {
                "boc": 1,
                "cont": 0,
                "eod": 0
              },
              "remark": null,
              "id": "sys-1-s2-i4"
            },
            {
              "code": "1.1.5",
              "description": "Voltage Transducer (Adtek CV-12)",
              "qty": 1,
              "watt": 0.15,
              "active": {
                "boc": 0,
                "cont": 0,
                "eod": 1
              },
              "remark": null,
              "id": "sys-1-s2-i5"
            },
            {
              "code": "1.1.6",
              "description": "Under Voltage Protection Relay (GE/P921)",
              "qty": 1,
              "watt": 3,
              "active": {
                "boc": 0,
                "cont": 1,
                "eod": 0
              },
              "remark": null,
              "id": "sys-1-s2-i6"
            },
            {
              "code": "1.1.7",
              "description": "OC/EF Protection Relay (Schneider/P3F30)",
              "qty": 1,
              "watt": 28,
              "active": {
                "boc": 0,
                "cont": 1,
                "eod": 0
              },
              "remark": null,
              "id": "sys-1-s2-i7"
            }
          ],
          "id": "sys-1-s2"
        },
        {
          "code": "1.3",
          "name": "OUTGOING MOTOR",
          "items": [
            {
              "code": "1.1.1",
              "description": "Closing Coil/Tripping Coil",
              "qty": 1,
              "watt": 495,
              "active": {
                "boc": 0,
                "cont": 0,
                "eod": 1
              },
              "remark": null,
              "id": "sys-1-s3-i1"
            },
            {
              "code": "1.1.2",
              "description": "Auxiliary Relays (Omron/LY4N)",
              "qty": 1,
              "watt": 7.5,
              "active": {
                "boc": 0,
                "cont": 1,
                "eod": 0
              },
              "remark": null,
              "id": "sys-1-s3-i2"
            },
            {
              "code": "1.1.3",
              "description": "VCB Indicating Light",
              "qty": 1,
              "watt": 2,
              "active": {
                "boc": 0,
                "cont": 1,
                "eod": 0
              },
              "remark": null,
              "id": "sys-1-s3-i3"
            },
            {
              "code": "1.1.4",
              "description": "Semaphore Indicator (Fuji)",
              "qty": 1,
              "watt": 1.5,
              "active": {
                "boc": 1,
                "cont": 0,
                "eod": 0
              },
              "remark": null,
              "id": "sys-1-s3-i4"
            },
            {
              "code": "1.1.5",
              "description": "Motor Protection Relay (Schneider/P3M30)",
              "qty": 1,
              "watt": 28,
              "active": {
                "boc": 0,
                "cont": 0,
                "eod": 1
              },
              "remark": null,
              "id": "sys-1-s3-i5"
            },
            {
              "code": "1.1.6",
              "description": "Lock out relay (Arteche/8J-8RP)",
              "qty": 1,
              "watt": 30,
              "active": {
                "boc": 0,
                "cont": 0,
                "eod": 0
              },
              "remark": "Only operate during fault. Hence not considered.",
              "id": "sys-1-s3-i6"
            }
          ],
          "id": "sys-1-s3"
        },
        {
          "code": "1.4",
          "name": "OUTGOING TRANSFORMER FEEDER",
          "items": [
            {
              "code": "1.1.1",
              "description": "Closing Coil/Tripping Coil",
              "qty": 1,
              "watt": 495,
              "active": {
                "boc": 0,
                "cont": 0,
                "eod": 1
              },
              "remark": null,
              "id": "sys-1-s4-i1"
            },
            {
              "code": "1.1.2",
              "description": "Auxiliary Relays (Omron/LY4N)",
              "qty": 1,
              "watt": 10.5,
              "active": {
                "boc": 0,
                "cont": 1,
                "eod": 0
              },
              "remark": null,
              "id": "sys-1-s4-i2"
            },
            {
              "code": "1.1.3",
              "description": "VCB Indicating Light",
              "qty": 1,
              "watt": 2,
              "active": {
                "boc": 0,
                "cont": 1,
                "eod": 0
              },
              "remark": null,
              "id": "sys-1-s4-i3"
            },
            {
              "code": "1.1.4",
              "description": "Semaphore Indicator (Fuji)",
              "qty": 1,
              "watt": 1.5,
              "active": {
                "boc": 1,
                "cont": 0,
                "eod": 0
              },
              "remark": null,
              "id": "sys-1-s4-i4"
            },
            {
              "code": "1.1.5",
              "description": "OC/EF Protection Relay (Schneider/P3F30)",
              "qty": 1,
              "watt": 28,
              "active": {
                "boc": 0,
                "cont": 0,
                "eod": 1
              },
              "remark": null,
              "id": "sys-1-s4-i5"
            },
            {
              "code": "1.1.6",
              "description": "Lock out relay (Arteche/8J-8RP)",
              "qty": 1,
              "watt": 30,
              "active": {
                "boc": 0,
                "cont": 0,
                "eod": 0
              },
              "remark": "Only operate during fault. Hence not considered.",
              "id": "sys-1-s4-i6"
            }
          ],
          "id": "sys-1-s4"
        },
        {
          "code": "1.5",
          "name": "LHS Bus VT",
          "items": [
            {
              "code": "1.1.2",
              "description": "Auxiliary Relays (Omron/LY4N)",
              "qty": 1,
              "watt": 1.5,
              "active": {
                "boc": 0,
                "cont": 1,
                "eod": 0
              },
              "remark": null,
              "id": "sys-1-s5-i1"
            },
            {
              "code": "1.1.4",
              "description": "Semaphore Indicator (Fuji)",
              "qty": 1,
              "watt": 0.75,
              "active": {
                "boc": 1,
                "cont": 0,
                "eod": 0
              },
              "remark": null,
              "id": "sys-1-s5-i2"
            },
            {
              "code": "1.1.5",
              "description": "Voltage Transducer (Adtek CV-12)",
              "qty": 1,
              "watt": 0.15,
              "active": {
                "boc": 0,
                "cont": 0,
                "eod": 1
              },
              "remark": null,
              "id": "sys-1-s5-i3"
            }
          ],
          "id": "sys-1-s5"
        }
      ],
      "id": "sys-1"
    },
    {
      "code": "2",
      "name": "415V LV Switchboard/ MCC (19-PMC5-001)",
      "doc": "Based on AC/DC Consumption & Heat Dissipation Calculation (19-PMC5-001)\n\nEMAS-EPCC-EXE-E00005-66-ELE-CAL-0003",
      "note": null,
      "items": [],
      "sections": [
        {
          "code": "2.1",
          "name": "INCOMER",
          "items": [
            {
              "code": "2.1.1",
              "description": "Relay Easergy P3T32",
              "qty": 2,
              "watt": 35,
              "active": {
                "boc": 0,
                "cont": 2,
                "eod": 0
              },
              "remark": null,
              "id": "sys-2-s1-i1"
            },
            {
              "code": "2.1.2",
              "description": "Indication Lamps (CB On/Off)",
              "qty": 2,
              "watt": 2.31,
              "active": {
                "boc": 0,
                "cont": 2,
                "eod": 0
              },
              "remark": null,
              "id": "sys-2-s1-i2"
            },
            {
              "code": "2.1.3",
              "description": "Miscellaneous Load (Auxiliary Relays)",
              "qty": 4,
              "watt": 0.9,
              "active": {
                "boc": 0,
                "cont": 4,
                "eod": 0
              },
              "remark": null,
              "id": "sys-2-s1-i3"
            },
            {
              "code": "2.1.4",
              "description": "ACB Spring Charging Motor",
              "qty": 2,
              "watt": 153,
              "active": {
                "boc": 0,
                "cont": 0,
                "eod": 2
              },
              "remark": "1 incomer considered for restoring normal power to DC UPS.",
              "id": "sys-2-s1-i4"
            },
            {
              "code": "2.1.5",
              "description": "ACB Closing Coil",
              "qty": 2,
              "watt": 3.825,
              "active": {
                "boc": 2,
                "cont": 0,
                "eod": 0
              },
              "remark": null,
              "id": "sys-2-s1-i5"
            },
            {
              "code": "2.1.6",
              "description": "ACB Tripping Coil",
              "qty": 2,
              "watt": 3.6,
              "active": {
                "boc": 0,
                "cont": 0,
                "eod": 2
              },
              "remark": "1 incomer considered",
              "id": "sys-2-s1-i6"
            },
            {
              "code": "2.1.7",
              "description": "Lock out relay",
              "qty": 2,
              "watt": 4,
              "active": {
                "boc": 0,
                "cont": 0,
                "eod": 0
              },
              "remark": "Only operate during fault. Hence not considered.",
              "id": "sys-2-s1-i7"
            },
            {
              "code": "2.1.8",
              "description": "Indication Lamps (Trip/Fault, Trip Circuit Fault)",
              "qty": 2,
              "watt": 2.31,
              "active": {
                "boc": 0,
                "cont": 2,
                "eod": 0
              },
              "remark": null,
              "id": "sys-2-s1-i8"
            }
          ],
          "id": "sys-2-s1"
        },
        {
          "code": "2.2",
          "name": "BUS COUPLER",
          "items": [
            {
              "code": "2.2.1",
              "description": "Relay Easergy P3F30",
              "qty": 1,
              "watt": 35,
              "active": {
                "boc": 0,
                "cont": 1,
                "eod": 0
              },
              "remark": null,
              "id": "sys-2-s2-i1"
            },
            {
              "code": "2.2.2",
              "description": "Zelio Voltage Relay",
              "qty": 2,
              "watt": 0.6,
              "active": {
                "boc": 2,
                "cont": 2,
                "eod": 2
              },
              "remark": null,
              "id": "sys-2-s2-i2"
            },
            {
              "code": "2.2.3",
              "description": "Indication Lamps (CB On/Off)",
              "qty": 1,
              "watt": 2.31,
              "active": {
                "boc": 0,
                "cont": 1,
                "eod": 0
              },
              "remark": null,
              "id": "sys-2-s2-i3"
            },
            {
              "code": "2.2.4",
              "description": "110/24 VDC Converter 20A 3.5A",
              "qty": 1,
              "watt": 569,
              "active": {
                "boc": 0,
                "cont": 1,
                "eod": 0
              },
              "remark": null,
              "id": "sys-2-s2-i4"
            },
            {
              "code": "2.2.5",
              "description": "Miscellaneous Load (Auxiliary Relays)",
              "qty": 1,
              "watt": 0.9,
              "active": {
                "boc": 0,
                "cont": 1,
                "eod": 0
              },
              "remark": null,
              "id": "sys-2-s2-i5"
            },
            {
              "code": "2.2.6",
              "description": "ACB Spring Charging Motor",
              "qty": 1,
              "watt": 153,
              "active": {
                "boc": 0,
                "cont": 0,
                "eod": 1
              },
              "remark": null,
              "id": "sys-2-s2-i6"
            },
            {
              "code": "2.2.7",
              "description": "ACB Closing Coil",
              "qty": 1,
              "watt": 3.825,
              "active": {
                "boc": 1,
                "cont": 0,
                "eod": 0
              },
              "remark": null,
              "id": "sys-2-s2-i7"
            },
            {
              "code": "2.2.8",
              "description": "ACB Tripping Coil",
              "qty": 1,
              "watt": 3.6,
              "active": {
                "boc": 0,
                "cont": 0,
                "eod": 1
              },
              "remark": null,
              "id": "sys-2-s2-i8"
            },
            {
              "code": "2.2.9",
              "description": "Indication Lamps (Trip/Fault, Trip Circuit Fault)",
              "qty": 1,
              "watt": 2.31,
              "active": {
                "boc": 0,
                "cont": 1,
                "eod": 0
              },
              "remark": null,
              "id": "sys-2-s2-i9"
            }
          ],
          "id": "sys-2-s2"
        },
        {
          "code": "2.3",
          "name": "OUTGOING FEEDER (ACB)",
          "items": [
            {
              "code": "2.3.1",
              "description": "ACB Spring Charging Motor",
              "qty": 3,
              "watt": 153,
              "active": {
                "boc": 0,
                "cont": 0,
                "eod": 2
              },
              "remark": "2 feeders operate",
              "id": "sys-2-s3-i1"
            },
            {
              "code": "2.3.2",
              "description": "ACB Closing Coil",
              "qty": 3,
              "watt": 3.825,
              "active": {
                "boc": 2,
                "cont": 0,
                "eod": 0
              },
              "remark": "2 feeders operate",
              "id": "sys-2-s3-i2"
            },
            {
              "code": "2.3.3",
              "description": "ACB Tripping Coil",
              "qty": 3,
              "watt": 3.6,
              "active": {
                "boc": 0,
                "cont": 0,
                "eod": 2
              },
              "remark": "2 feeders operate",
              "id": "sys-2-s3-i3"
            },
            {
              "code": "2.3.4",
              "description": "Indication Lights (Trip/Fault, Trip Current Fault)",
              "qty": 3,
              "watt": 2.31,
              "active": {
                "boc": 0,
                "cont": 3,
                "eod": 0
              },
              "remark": "3 feeders operate",
              "id": "sys-2-s3-i4"
            }
          ],
          "id": "sys-2-s3"
        },
        {
          "code": "2.4",
          "name": "24VDC (TeSys-T)",
          "items": [
            {
              "code": "2.4.1",
              "description": "LTM R08MBD",
              "qty": 27,
              "watt": 3,
              "active": {
                "boc": 0,
                "cont": 0,
                "eod": 0
              },
              "remark": "Not included since covered in 110/24 VDC Converter",
              "id": "sys-2-s4-i1"
            },
            {
              "code": "2.4.2",
              "description": "LTM R27MBD",
              "qty": 46,
              "watt": 3,
              "active": {
                "boc": 0,
                "cont": 0,
                "eod": 0
              },
              "remark": null,
              "id": "sys-2-s4-i2"
            },
            {
              "code": "2.4.3",
              "description": "LTM R100MBD",
              "qty": 16,
              "watt": 3,
              "active": {
                "boc": 0,
                "cont": 0,
                "eod": 0
              },
              "remark": null,
              "id": "sys-2-s4-i3"
            }
          ],
          "id": "sys-2-s4"
        }
      ],
      "id": "sys-2"
    },
    {
      "code": "3",
      "name": "415V LV Switchboard/ MCC (19-PDB5-001)",
      "doc": "Based on AC/DC Consumption & Heat Dissipation Calculation (19-PDB5-001)\n\nEMAS-EPCC-EXE-E00005-66-ELE-CAL-0001",
      "note": null,
      "items": [],
      "sections": [
        {
          "code": "3.1",
          "name": "INCOMER",
          "items": [
            {
              "code": "3.1.1",
              "description": "Relay Easergy P3F30",
              "qty": 2,
              "watt": 35,
              "active": {
                "boc": 0,
                "cont": 2,
                "eod": 0
              },
              "remark": null,
              "id": "sys-3-s1-i1"
            },
            {
              "code": "3.1.2",
              "description": "Indication Lights (CB On/Off)",
              "qty": 2,
              "watt": 2.31,
              "active": {
                "boc": 0,
                "cont": 2,
                "eod": 0
              },
              "remark": null,
              "id": "sys-3-s1-i2"
            },
            {
              "code": "3.1.3",
              "description": "110/24 VDC Converter 20A 3.5A",
              "qty": 1,
              "watt": 180,
              "active": {
                "boc": 0,
                "cont": 1,
                "eod": 0
              },
              "remark": null,
              "id": "sys-3-s1-i3"
            },
            {
              "code": "3.1.4",
              "description": "Miscellaneous Load (Auxiliary Relays)",
              "qty": 4,
              "watt": 0.9,
              "active": {
                "boc": 0,
                "cont": 4,
                "eod": 0
              },
              "remark": null,
              "id": "sys-3-s1-i4"
            },
            {
              "code": "3.1.5",
              "description": "ACB Spring Charging Motor",
              "qty": 2,
              "watt": 153,
              "active": {
                "boc": 0,
                "cont": 0,
                "eod": 1
              },
              "remark": "1 incomer considered",
              "id": "sys-3-s1-i5"
            },
            {
              "code": "3.1.6",
              "description": "ACB Closing Coil",
              "qty": 2,
              "watt": 3.825,
              "active": {
                "boc": 0,
                "cont": 0,
                "eod": 1
              },
              "remark": "1 incomer considered",
              "id": "sys-3-s1-i6"
            },
            {
              "code": "3.1.7",
              "description": "ACB Tripping Coil",
              "qty": 2,
              "watt": 3.6,
              "active": {
                "boc": 1,
                "cont": 0,
                "eod": 0
              },
              "remark": "1 incomer considered",
              "id": "sys-3-s1-i7"
            },
            {
              "code": "3.1.8",
              "description": "Lock out relay",
              "qty": 2,
              "watt": 4,
              "active": {
                "boc": 0,
                "cont": 0,
                "eod": 0
              },
              "remark": "Only operate during fault. Hence not considered.",
              "id": "sys-3-s1-i8"
            },
            {
              "code": "3.1.9",
              "description": "Indication Lights (Trip/Fault, Trip Current Fault)",
              "qty": 2,
              "watt": 2.31,
              "active": {
                "boc": 0,
                "cont": 2,
                "eod": 0
              },
              "remark": null,
              "id": "sys-3-s1-i9"
            }
          ],
          "id": "sys-3-s1"
        },
        {
          "code": "3.2",
          "name": "24VDC (TeSys-T)",
          "items": [
            {
              "code": "3.2.1",
              "description": "LTM R08MBD",
              "qty": 5,
              "watt": 3,
              "active": {
                "boc": 0,
                "cont": 0,
                "eod": 0
              },
              "remark": "Not included since covered in 110/24 VDC Converter",
              "id": "sys-3-s2-i1"
            },
            {
              "code": "3.2.2",
              "description": "LTM R27MBD",
              "qty": 1,
              "watt": 3,
              "active": {
                "boc": 0,
                "cont": 0,
                "eod": 0
              },
              "remark": null,
              "id": "sys-3-s2-i2"
            }
          ],
          "id": "sys-3-s2"
        }
      ],
      "id": "sys-3"
    },
    {
      "code": "4",
      "name": "415V LV Switchboard/ MCC (19-PEB5-001)",
      "doc": "Based on AC/DC Consumption & Heat Dissipation Calculation (19-PEB5-001)\n\nEMAS-EPCC-EXE-E00005-66-ELE-CAL-0002",
      "note": null,
      "items": [],
      "sections": [
        {
          "code": "4.1",
          "name": "INCOMER",
          "items": [
            {
              "code": "4.1.1",
              "description": "Relay Easergy P3F30",
              "qty": 2,
              "watt": 35,
              "active": {
                "boc": 0,
                "cont": 2,
                "eod": 0
              },
              "remark": null,
              "id": "sys-4-s1-i1"
            },
            {
              "code": "4.1.2",
              "description": "Indication Lights (CB On/Off)",
              "qty": 2,
              "watt": 2.31,
              "active": {
                "boc": 0,
                "cont": 2,
                "eod": 0
              },
              "remark": null,
              "id": "sys-4-s1-i2"
            },
            {
              "code": "4.1.3",
              "description": "110/24 VDC Converter 20A 3.5A",
              "qty": 1,
              "watt": 180,
              "active": {
                "boc": 0,
                "cont": 1,
                "eod": 0
              },
              "remark": null,
              "id": "sys-4-s1-i3"
            },
            {
              "code": "4.1.4",
              "description": "Miscellaneous Load (Auxiliary Relays)",
              "qty": 4,
              "watt": 0.9,
              "active": {
                "boc": 0,
                "cont": 4,
                "eod": 0
              },
              "remark": null,
              "id": "sys-4-s1-i4"
            },
            {
              "code": "4.1.5",
              "description": "ACB Spring Charging Motor",
              "qty": 2,
              "watt": 153,
              "active": {
                "boc": 0,
                "cont": 0,
                "eod": 1
              },
              "remark": "1 incomer considered",
              "id": "sys-4-s1-i5"
            },
            {
              "code": "4.1.6",
              "description": "ACB Closing Coil",
              "qty": 2,
              "watt": 3.825,
              "active": {
                "boc": 0,
                "cont": 0,
                "eod": 1
              },
              "remark": "1 incomer considered",
              "id": "sys-4-s1-i6"
            },
            {
              "code": "4.1.7",
              "description": "ACB Tripping Coil",
              "qty": 2,
              "watt": 3.6,
              "active": {
                "boc": 1,
                "cont": 0,
                "eod": 0
              },
              "remark": "1 incomer considered",
              "id": "sys-4-s1-i7"
            },
            {
              "code": "4.1.8",
              "description": "Lock out relay",
              "qty": 2,
              "watt": 4,
              "active": {
                "boc": 0,
                "cont": 0,
                "eod": 0
              },
              "remark": "Only operate during fault. Hence not considered.",
              "id": "sys-4-s1-i8"
            },
            {
              "code": "4.1.9",
              "description": "Indication Lights (Trip/Fault, Trip Current Fault)",
              "qty": 2,
              "watt": 2.31,
              "active": {
                "boc": 0,
                "cont": 2,
                "eod": 0
              },
              "remark": null,
              "id": "sys-4-s1-i9"
            }
          ],
          "id": "sys-4-s1"
        },
        {
          "code": "4.2",
          "name": "24VDC (TeSys-T)",
          "items": [
            {
              "code": "4.2.1",
              "description": "LTM R08MBD",
              "qty": 17,
              "watt": 3,
              "active": {
                "boc": 0,
                "cont": 0,
                "eod": 0
              },
              "remark": "Not included since covered in 110/24 VDC Converter",
              "id": "sys-4-s2-i1"
            }
          ],
          "id": "sys-4-s2"
        }
      ],
      "id": "sys-4"
    },
    {
      "code": "5",
      "name": "A&SS PANEL",
      "doc": "Based on AC/DC Consumption Calculation (19-PAS-001)\n\nEMAS-EPCC-EXE-E00006-66-ELE-CAL-0001",
      "note": null,
      "items": [
        {
          "code": "5",
          "description": "A&SS PANEL",
          "qty": 1,
          "watt": 2090.0,
          "active": {
            "boc": 0,
            "cont": 1,
            "eod": 0
          },
          "remark": "Redundant",
          "id": "sys-5-i1"
        }
      ],
      "sections": [],
      "id": "sys-5"
    }
  ],
  "sizing": {
    "nominalVoltage": 110,
    "minVoltage": 99,
    "autonomyMin": 240,
    "agingFactor": 0.1,
    "spareFactor": 0.2,
    "tempFactor": 1.0,
    "strings": 2,
    "redundancy": "2 × 100%",
    "selectedCellAh": 280,
    "cellModel": "VTX1 L 280",
    "catalog": [
      100,
      140,
      200,
      280,
      320,
      400,
      500
    ],
    "ktTable": [
      {
        "minutes": 1,
        "kt": 1.3
      },
      {
        "minutes": 2,
        "kt": 1.51
      },
      {
        "minutes": 5,
        "kt": 1.84
      },
      {
        "minutes": 10,
        "kt": 2.14
      },
      {
        "minutes": 15,
        "kt": 2.33
      },
      {
        "minutes": 30,
        "kt": 2.71
      },
      {
        "minutes": 45,
        "kt": 2.95
      },
      {
        "minutes": 60,
        "kt": 3.14
      },
      {
        "minutes": 90,
        "kt": 3.43
      },
      {
        "minutes": 120,
        "kt": 3.65
      },
      {
        "minutes": 180,
        "kt": 3.98
      },
      {
        "minutes": 240,
        "kt": 4.24
      },
      {
        "minutes": 300,
        "kt": 4.24
      },
      {
        "minutes": 420,
        "kt": 4.78
      },
      {
        "minutes": 480,
        "kt": 4.92
      },
      {
        "minutes": 600,
        "kt": 5.17
      }
    ],
    "ktSource": "Peukert-style fit anchored at 1.30 (1 min) and 4.24 (240 min). Replace with the cell manufacturer's discharge table for final issue."
  },
  "notes": [
    "All loads shown are assumed values and shall be further revised and updated based on the latest requirement and vendor information.",
    "Loads that operate only during fault (lock-out relays) are excluded from the discharge profile.",
    "20% future spare is already implicit in the connected load; it is applied again here as a configurable design allowance.",
    "Battery is configured as 2 × 100% strings; each string is sized to carry the full design load."
  ],
  "references": [
    {
      "tag": "19-PSW4-001",
      "desc": "6.6 kV Switchgear — DC load list",
      "doc": "EMAS-EPCC-EXE-CHRM-66-ELE-CAL-1007"
    },
    {
      "tag": "19-PMC5-001",
      "desc": "415 V LV Switchboard / MCC — AC-DC consumption & heat dissipation",
      "doc": "EMAS-EPCC-EXE-E00005-66-ELE-CAL-0003"
    },
    {
      "tag": "19-PDB5-001",
      "desc": "415 V LV Switchboard / MCC — AC-DC consumption & heat dissipation",
      "doc": "EMAS-EPCC-EXE-E00005-66-ELE-CAL-0001"
    },
    {
      "tag": "19-PEB5-001",
      "desc": "415 V LV Switchboard / MCC — AC-DC consumption & heat dissipation",
      "doc": "EMAS-EPCC-EXE-E00005-66-ELE-CAL-0002"
    },
    {
      "tag": "19-PAS-001",
      "desc": "A&SS Panel — AC-DC consumption",
      "doc": "EMAS-EPCC-EXE-E00006-66-ELE-CAL-0001"
    }
  ]
}

