# Scouts-Elections

## Introduction

This static website is a program that lets our Scouts group create Elections to determine which leaders will be in our subgroups.

As we don't know how many kids will be there on Election day (absences...), this program allows for configurations on setup and when ready, shows the voting page with all the candidates entered on setup with a customizable number of votes. That voting page repeats until all the voters have went through.

Since we don't want to know who voted for who, there is no need to "register", but we need to confirm if the kid really voted or not, and prevent him from voting more than once (which may skew the results).
Therefore, after a voter's vote, an overlay shows on the voting page, preventing any further actions until the special input is pressed, which will reset the page to allow for the next voter to actually vote.

There is two way to trigger that special input :
- When using a keyboard, you can use the current default of `space`
- When having a touchscreen, you also have the ability to long press the top half portion of the overlay.

Whenever that special input is used, a toast notification shows up for a brief moment showing how much votes remains, to keep track of the progress of the current voting session.

That toast notification also has a button to skip remaining voters, in case you miscalculated the number of voters or simply want to skip the remaining ones.
If skipped, the database will contain this information, which means that when loading this database the results will be shown right away (after entering the password, of course).

## Setup page

In the setup page, validations are used to prevent any bad inputs on setup (empty number of voters, empty candidate name, number of votes higher than the number of candidates *(which doesn't make sense, as every candidates would be voted for...)*, etc).

Currently, the number of votes is absolute and a voter cannot put two votes on the same candidate.
I may add a configuration option later on to allow for voting between `x` and `y` times, and another option for voting multiple times for the same candidate, but this wasn't our needs and was therefore not worked on.

Those two last features are in my todo list, and you can track both under their given issues :
- Voting between `x` and `y` times instead of only `x` times : [#45]([3])
- Multiple votes per candidate instead of max 1 : [#46]([4])

The name of the database is the name that will be given to the file if you want to download the database at the end.
Validations rules on it prevents you from entering a filename that wouldn't be accepted by Windows systems.

## Voting

After setup, at any point, if the page gets reloaded or closed, the database will be downloaded in an unfinished state, allowing you to return to the state you were in.

This allows some sort of protection in case a smart kid decides he wants to press Alt+F4 to mess up stuff.

In the case you want to disable that, there is a checkbox in the setup page that is checked by default - simply uncheck it and the database won't download automatically.
Even with the automatic download disabled, you will still be able to download the database manually in the end if desired.

## Results

Before showing results, a password is asked to prevent kids from viewing the results by accident.
The password is currently hardcoded to `VL` ("**V**ieux-**L**oups"), but may be switched to a setup-based password selection (view [#32][1]).

The results shown at the end are sorted by number of votes, meaning the most voted candidate will be on top and the lowest voted candidate will be at the bottom.

The rows are clickable, which highlights the candidates (in a cycle of *unselected*, *pre-selected* and *selected*), allowing for discussions with other maintainers.

The button to return to the homepage currently simply reloads the page, as this was an easier way of resetting the program's state at the time. This behavior is something I want to change, which you can follow my progress in [#43]([2]).

## Miscellaneous

All the text in here is in French, since our group is French-based.
Code is in English because code should always be in English.

[1]: https://github.com/V-ed/Scouts-Elections/issues/32
[2]: https://github.com/V-ed/Scouts-Elections/issues/43
[3]: https://github.com/V-ed/Scouts-Elections/issues/45
[4]: https://github.com/V-ed/Scouts-Elections/issues/46
