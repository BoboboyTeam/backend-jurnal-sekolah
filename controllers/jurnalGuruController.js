import { ObjectId } from "mongodb";
import JurnalGuru from "../models/jurnal_teacher.js";
import User from '../models/user.js';

export default class JurnalGuruController {
  static async findAll(req, res, next) {
    try {
      let jurnalGuru;
      if (req.user.role.toLowerCase() === "admin") {
        // Filter Feature
        if (req.query.teacher) {
          jurnalGuru = await JurnalGuru.findAllByGuru(req.query.teacher);
        } else if (req.query.kelas) {
          jurnalGuru = await JurnalGuru.findAllByObj({
            kelas: req.query.kelas,
          });
        } else if (req.query.hari) {
          jurnalGuru = await JurnalGuru.findAllByObj({
            hari: req.query.hari,
          });
        } else {
          jurnalGuru = await JurnalGuru.findAll();
        }
      } else if (req.user.role.toLowerCase() === "teacher") {
        jurnalGuru = await JurnalGuru.findAllByGuruId(req.user.id);
      }
      jurnalGuru.map((jurnal) => {
        jurnal.createAt = new Date(jurnal.createAt).toDateString();
        jurnal.updateAt = new Date(jurnal.updateAt).toDateString();
      });
      // Main Feature
      return res.status(200).json(jurnalGuru)
    } catch (err) {
      next(err);
    }
  }

  static async invoicesAll(req, res, next) {
    try {
      const month = req.query?.month
        ? req.query?.month
        : new Date().getMonth() > 9
        ? new Date().getMonth() + 1
        : `0${new Date().getMonth() + 1}`;
      const year = req.query?.year ? req.query?.year : new Date().getFullYear();

      const from = req.query.from ? req.query.from : null;
      const to = req.query.to ? req.query.to : null;

      const startDate = from ? new Date(from) : new Date(`${year}-${month}`);
      const endDate = to ? new Date(to) : new Date(`${year}`, `${month}`, 1);
      const gurus = await User.findAllByRole('teacher');
      let dataJurnal = [];
      // return res.status(200).json(gurus);
      const promises = gurus.map(async (guru) => {
      let teacher = guru._id;
      // console.log(teacher, startDate, endDate,"AAAAAAAAAAAAAAAAAAAAAAAAAA");
      const jurnalGuru = await JurnalGuru.findAllByGuruDateRange(
        teacher ? teacher : "",
        startDate,
        endDate
      );

      let totalJP = 0;
      let dataJP = {};
     
      jurnalGuru.forEach((jurnal) => {
        let condition;
        /*
        cek teacher
        jika teacher sama dengan teacher yang login maka true 
        jika teacherReplacement sama dengan teacher yang login maka true

        XOR Gate
        0 1 |1
        1 0 |1
        1 1 |0
        0 0 |0
        + OR (A ^ B) ^ (A & B)
        0 1 |1
        1 0 |1
        1 1 |0
        0 0 |0

        Wrap Not (X)
        0 1 |0
        1 0 |0
        1 1 |1
        0 0 |1

        */
        condition = `${jurnal?.teacher?._id}` === `${teacher}`;
        if(jurnal?.teacherReplacement?._id){
          let condition1 = `${jurnal?.teacherReplacement?._id}` === `${teacher}`;
          let condition2 = condition || `${jurnal?.teacherReplacement?._id}` === `${teacher}`;

          condition = condition1
        }
        /**
         * 0 1 0
         */
        else{
          condition = condition && true;
        }
        condition = condition && !!jurnal.jumlahJP;
        if (condition) {
          totalJP += parseInt(jurnal.jumlahJP);
          const monthKey = jurnal.updateAt.getMonth();
          const jumlahJP = jurnal.jumlahJP ? parseInt(jurnal.jumlahJP) : 0;
          if (dataJP[monthKey]) {
            dataJP[monthKey]["jumlahJP"] += jumlahJP;
            dataJP[monthKey]["gaji"] += jumlahJP * 10000;
          } else {
            dataJP[monthKey] = {};
            dataJP[monthKey]["jumlahJP"] = jumlahJP;
            dataJP[monthKey]["gaji"] = jumlahJP * 10000;
          }
        }
      });
      jurnalGuru.map((jurnal) => {
        jurnal.createAt = new Date(jurnal.createAt).toDateString();
        jurnal.updateAt = new Date(jurnal.updateAt).toDateString();
      });
      const gaji = totalJP * 10000;
      if (jurnalGuru.length > 0) {
        return {
          nama: guru.nama,
          tanggal: `${startDate.toDateString()} - ${endDate.toDateString()}`,
          totalJP,
          gaji,
          dataJP,
          columnName: [
            "Date",
            "Start Hours",
            "Lesson Material",
            "Working Hours",
            "Payment",
          ],
          keyColumns: [
            "updateAt",
            "jamKe",
            "materi",
            "jumlahJP",
            "Payment",
          ],
          data: jurnalGuru,
        };
      }
      return null;
          })
      
      // Wait for all promises to complete
      const results = await Promise.all(promises);
      console.log(results[0].dataJP[Object.keys(results[0].dataJP)[0]]);

      // Filter out any null results
      dataJurnal = results.filter(item => item !== null);

      return dataJurnal.length > 0 ? res.status(200).json(dataJurnal) : res.status(404).json({ message: "Data not found" });
    } catch (error) {
      next(error);
    }
  }

  static async findAllByRangeDate(req, res, next) {
    try {
      const month = req.query?.month
        ? req.query?.month
        : new Date().getMonth() > 9
        ? new Date().getMonth() + 1
        : `0${new Date().getMonth() + 1}`;
      const year = req.query?.year ? req.query?.year : new Date().getFullYear();

      const from = req.query.from ? req.query.from : null;
      const to = req.query.to ? req.query.to : null;

      const startDate = from ? new Date(from) : new Date(`${year}-${month}`);
      const endDate = to ? new Date(to) : new Date(`${year}`, `${month}`, 1);

      let teacher =
        req.user.role.toLowerCase() === "admin"
          ? new ObjectId(req.params.id)
          : req.user.id;
      if(!req.params.id){
        teacher = null;
      }
      if(req.user.role.toLowerCase() === "teacher"){
        teacher = req.user.id;
      }
      console.log(teacher, startDate, endDate,"AAAAAAAAAAAAAAAAAAAAAAAAAA");
      const jurnalGuru = await JurnalGuru.findAllByGuruDateRange(
        teacher ? teacher : "",
        startDate,
        endDate
      );

      let totalJP = 0;
      let dataJP = {};
      jurnalGuru.forEach((jurnal) => {
        let condition;
        /*
        cek teacher
        jika teacher sama dengan teacher yang login maka true 
        jika teacherReplacement sama dengan teacher yang login maka true

        XOR Gate
        0 1 |1
        1 0 |1
        1 1 |0
        0 0 |0
        + OR (A ^ B) ^ (A & B)
        0 1 |1
        1 0 |1
        1 1 |0
        0 0 |0

        Wrap Not (X)
        0 1 |0
        1 0 |0
        1 1 |1
        0 0 |1

        */
        condition = `${jurnal?.teacher?._id}` === `${teacher}`;
        if(jurnal?.teacherReplacement?._id){
          let condition1 = `${jurnal?.teacherReplacement?._id}` === `${teacher}`;
          let condition2 = condition || `${jurnal?.teacherReplacement?._id}` === `${teacher}`;

          condition = condition1
        }
        /**
         * 0 1 0
         */
        else{
          condition = condition && true;
        }
        condition = condition && !!jurnal.jumlahJP;
        if (condition) {
          totalJP += parseInt(jurnal.jumlahJP);
          const monthKey = jurnal.updateAt.getMonth();
          const jumlahJP = jurnal.jumlahJP ? parseInt(jurnal.jumlahJP) : 0;
          if (dataJP[monthKey]) {
            dataJP[monthKey]["jumlahJP"] += jumlahJP;
            dataJP[monthKey]["gaji"] += jumlahJP * 10000;
          } else {
            dataJP[monthKey] = {};
            dataJP[monthKey]["jumlahJP"] = jumlahJP;
            dataJP[monthKey]["gaji"] = jumlahJP * 10000;
          }
        }
      });
      jurnalGuru.map((jurnal) => {
        jurnal.createAt = new Date(jurnal.createAt).toDateString();
        jurnal.updateAt = new Date(jurnal.updateAt).toDateString();
      });
      const gaji = totalJP * 10000;
      return jurnalGuru.length > 0
        ? res.status(200).json({
            totalJP,
            gaji,
            dataJP,
            data: jurnalGuru,
          })
        : res.status(404).json({ message: "Data not found" });
    } catch (error) {
      next(error);
    }
  }

  static async findNow(req, res, next) {
    try {
      const startDate = req.user.startDate;
      const endDate = req.user.endDate;
      const teacher = req.user.nama;
      console.log(teacher, startDate, endDate);
      const jurnalGuru = await JurnalGuru.findAllByGuruDateRange(
        teacher,
        startDate,
        endDate
      );
      console.log(jurnalGuru);
      jurnalGuru.map((jurnal) => {
        jurnal.createAt = new Date(jurnal.createAt).toDateString();
        jurnal.updateAt = new Date(jurnal.updateAt).toDateString();
      });
      return res.status(200).json(jurnalGuru);
    } catch (err) {
      next(err);
    }
  }
  static async findAllByGuruId(req, res, next) {
    try {
      const jurnalGuru = await JurnalGuru.findAllByGuruId(req.params.id);
      jurnalGuru?.map((jurnal) => {
        jurnal.createAt = new Date(jurnal.createAt).toDateString();
        jurnal.updateAt = new Date(jurnal.updateAt).toDateString();
      });
      return jurnalGuru.length > 0
        ? res.status(200).json(jurnalGuru)
        : res.status(404).json({ message: "Data not found" });
    } catch (err) {
      next(err);
    }
  }

  static async findAllByGuru(req, res, next) {
    try {
      const jurnalGuru = await JurnalGuru.findAllByGuru(req.params.teacher);
      jurnalGuru.map((jurnal) => {
        jurnal.createAt = new Date(jurnal.createAt).toDateString();
        jurnal.updateAt = new Date(jurnal.updateAt).toDateString();
      });
      return jurnalGuru.length > 0
        ? res.status(200).json(jurnalGuru)
        : res.status(404).json({ message: "Data not found" });
    } catch (err) {
      next(err);
    }
  }

  static async findOne(req, res, next) {
    try {
      const jurnalGuru = await JurnalGuru.findById(req.params.id);
      jurnalGuru.createAt = new Date(jurnalGuru.createAt).toDateString();
      jurnalGuru.updateAt = new Date(jurnalGuru.updateAt).toDateString();
      return jurnalGuru
        ? res.status(200).json(jurnalGuru)
        : res.status(404).json({ message: "Data not found" });
    } catch (err) {
      next(err);
    }
  }

  static async create(req, res, next) {
    try {
      const {
        hari,
        mapel,
        kelas,
        jamKe,
        teacher,
        teacherReplacement,
        materi,
        jumlahJP,
      } = req.body;
      teacher._id = new ObjectId(teacher._id);
      if (teacherReplacement?._id) {
        teacherReplacement._id = new ObjectId(teacherReplacement._id);
      }
      const jurnalGuru = await JurnalGuru.create({
        hari,
        mapel,
        kelas,
        jamKe,
        createAt: new Date(),
        updateAt: new Date(),
        teacher,
        teacherReplacement,
        materi,
        jumlahJP,
      });

      res.status(201).json(jurnalGuru);
    } catch (err) {
      next(err);
    }
  }

  static async updateOne(req, res, next) {
    try {
      const filter = { _id: req.params.id };
      req.body.teacher._id = new ObjectId(req.body.teacher._id);
      if (req.body.teacherReplacement?._id) {
        req.body.teacherReplacement._id = new ObjectId(
          req.body.teacherReplacement._id
        );
      }
      const update = { $set: { ...req.body, updateAt: new Date() } };
      const jurnalGuru = await JurnalGuru.updateOne(filter, update);
      return jurnalGuru
        ? res.status(200).json(jurnalGuru)
        : res.status(404).json({ message: "Data not found" });
    } catch (err) {
      next(err);
    }
  }

  static async deleteOne(req, res, next) {
    try {
      const filter = { _id: req.params.id };
      const jurnalGuru = await JurnalGuru.deleteOne(filter);
      return jurnalGuru
        ? res.status(200).json(jurnalGuru)
        : res.status(404).json({ message: "Data not found" });
    } catch (err) {
      next(err);
    }
  }
}
