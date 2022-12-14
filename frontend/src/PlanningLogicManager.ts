import {Day, Disponibility, Reservation} from "./types";
import axiosInstance from "./axiosInstance";
import {dayIndexToDayName, monthIndexToMonthName} from "./utils";
import moment, {Moment} from "moment";


class PlanningLogicManager {
    private currentWeek: Moment;

    private allDisponibilities: Disponibility[];
    private allReservations: Reservation[];

    private weekDisponibilities: { [key: number]: Disponibility[] } = {};
    private weekReservations: { [key: number]: Reservation[] } = {};

    /**
     * Fetch all the disponibilities stored in the database
     */
    async refreshDisponibilities() {
        const response = await axiosInstance.get("api/v1/disponibilities");

        this.allDisponibilities = response.data.data.map((disponibility: any) => {
            // Parse starting date but set the time to 00:00:00
            const startDate = moment(new Date(disponibility.startDate)).startOf("day");

            // Parse ending date but set the time to 23:59:59
            const endDate = moment(new Date(disponibility.endDate)).endOf("day");

            return {
                ...disponibility,
                startDate: startDate,
                endDate: endDate,
                // OpenningTime is set as a string like 8.50 for 8h30 and 7.25 for 7h15
                // We need to convert it to a Date object
                openningTime: moment(new Date(0, 0, 0, Math.floor(disponibility.openningTime), (disponibility.openningTime % 1) * 60)),
                // Same for closing time
                closingTime: moment(new Date(0, 0, 0, Math.floor(disponibility.closingTime), (disponibility.closingTime % 1) * 60)),
            };
        });
    }

    /**
     * Fetch all the reservations stored in the database
     */
    async refreshReservations() {
        const response = await axiosInstance.get("api/v1/reservations");

        this.allReservations = response.data.data.map((reservation: any) => {
            // Parse starting date but set the time to 00:00:00
            const startDate = moment(reservation.startDate);

            // Parse ending date but set the time to 23:59:59
            const endDate = moment(reservation.endDate);

            return {
                ...reservation,
                startDate: startDate,
                endDate: endDate,
            };
        });
    }

    async refreshWeek() {
        await this.refreshDisponibilities();

        // Only keep the disponibilities that are in the current week
        const filteredDisponibilities = this.allDisponibilities.filter((disponibility) => {
            return this.currentWeek.isBetween(disponibility.startDate, disponibility.endDate);
        });

        // Reduce in map of day index to disponibilities
        this.weekDisponibilities = filteredDisponibilities.reduce((acc, disponibility) => {
            if (!acc[disponibility.day]) {
                acc[disponibility.day] = [];
            }
            acc[disponibility.day].push(disponibility);
            return acc;
        }, {});

        await this.refreshReservations();

        // Only keep this week's reservations
        const filteredReservations = this.allReservations.filter((reservation) => {
            return (this.currentWeek.year() === reservation.startDate.year()
                    || this.currentWeek.year() === reservation.endDate.year())
                && (this.currentWeek.isoWeek() === reservation.startDate.isoWeek()
                    || this.currentWeek.isoWeek() === reservation.endDate.isoWeek());
        });

        // Reduce in map of day index to reservations
        this.weekReservations = filteredReservations.reduce((acc, reservation) => {
            if (!acc[reservation.startDate.day()]) {
                acc[reservation.startDate.day()] = [];
            }
            acc[reservation.startDate.day()].push(reservation);
            return acc;
        }, {});
    }

    constructor() {
        this.allDisponibilities = [];
        this.allReservations = [];
    }

    /**
     * Get the disponibilities and reservations for the current day
     */
    getCurrentDay(): Day {
        const dayIndex = this.currentWeek.days();

        return {
            disponibilities: this.weekDisponibilities[dayIndex],
            reservations: this.weekReservations[dayIndex],
            dayIndex: this.currentWeek.date(),
            dayName: `${dayIndexToDayName[dayIndex]} ${this.currentWeek.date()} ${monthIndexToMonthName[this.currentWeek.month()]}`,
            isoString: this.currentWeek.toISOString(),
        };
    }

    /**
     * Get the disponibilities and reservations for the next day
     */
    async getNextDay(): Promise<Day> {
        const previousWeek = this.currentWeek.isoWeek();

        this.currentWeek.add(1, "days");

        // If the week has changed, we need to refresh the disponibilities and reservations
        if (previousWeek !== this.currentWeek.isoWeek()) {
            await this.refreshWeek();
        }

        return this.getCurrentDay();
    }

    async getNextWeek(): Promise<void> {
        this.currentWeek.add(1, "weeks");

        await this.refreshWeek();
    }

    async getPreviousWeek(): Promise<void> {
        this.currentWeek.subtract(1, "weeks");

        await this.refreshWeek();
    }

    /**
     * Get the disponibilities and reservations for the previous day
     */
    async getPreviousDay(): Promise<Day> {
        const previousWeek = this.currentWeek.isoWeek();

        this.currentWeek.subtract(1, "days");

        // If the week has changed, we need to refresh the disponibilities and reservations
        if (previousWeek !== this.currentWeek.isoWeek()) {
            await this.refreshWeek();
        }

        return this.getCurrentDay();
    }

    async setWeek(date: Moment) {
        this.currentWeek = date;

        await this.refreshWeek();
    }

    resetToToday(): void {
        // this.currentWeek = moment();
        this.currentWeek = moment(new Date(2022, 7, 25, 12));
    }

    getReservations(): { [key: number]: Reservation[] } {
        return this.weekReservations;
    }

    getCurrentWeek(): Moment {
        return this.currentWeek;
    }
}

const planningLogicManager = new PlanningLogicManager();

export default planningLogicManager;