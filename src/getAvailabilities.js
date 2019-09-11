import moment from "moment";
import knex from "knexClient";

export default async function getAvailabilities(date) {
  const availabilities = new Map();
  for (let i = 0; i < 7; ++i) {
    const tmpDate = moment(date).add(i, "days");
    availabilities.set(tmpDate.format("d"), {
      date: tmpDate.toDate(),
      slots: []
    });
  }

  // const events = await knex
  //   .select("kind", "starts_at", "ends_at", "weekly_recurring")
  //   .from("events")
  //   .where(function() {
  //     this.where("weekly_recurring",true).andWhere("starts_at","<",+date);
  //   }).orWhere(function(){
  //     this.where("weekly_recurring",null).andWhere("ends_at",">",+date)
  //   }).orderBy("weekly_recurring","desc");

  const events = await knex
    .select("kind", "starts_at", "ends_at", "weekly_recurring")
    .from("events")
    .where(function() {
      this.where("weekly_recurring",true).andWhere(knex.raw('Cast(((starts_at) - (?))/86400000 As Integer) < ?',[date,7]));
    }).orWhere(function(){
      this.where("weekly_recurring",null)
      .andWhere(knex.raw('Cast(((starts_at) - (?))/86400000 As Integer) < ?',[date,7]))
      .andWhere(knex.raw('Cast(((ends_at) - (?))/86400000 As Integer) < ?',[date,7]))
      .andWhere(knex.raw('Cast(((starts_at) - (?))/86400000 As Integer) >= ?',[date,0]))
      .andWhere(knex.raw('Cast(((ends_at) - (?))/86400000 As Integer) >= ?',[date,0]));
    }).orderBy("weekly_recurring","desc");

  // knex.raw(` SELECT Cast(((ends_at) - (?))/(86400000) As Integer) FROM events`,[(date).getTime()]).then(function(res){
  //   console.log("abhi",res,date.getTime());
  // })
    
  //console.log("events",events,date);
  for (const event of events) {
    for (
      let date = moment(event.starts_at);
      date.isBefore(event.ends_at);
      date.add(30, "minutes")
    ) {
      const day = availabilities.get(date.format("d"));
      if (event.kind === "opening") {
        day.slots.push(date.format("H:mm"));
      } else if (event.kind === "appointment") {
        day.slots = day.slots.filter(
          slot => slot.indexOf(date.format("H:mm")) === -1
        );
      }
    }
  }
  return Array.from(availabilities.values())
}
