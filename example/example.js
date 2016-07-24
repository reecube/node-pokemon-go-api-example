'use strict';

// npm modules
let fs = require('fs'),
    swig = require('swig'),
// local modules
    PokemonGO = require('pokemon-go-node-api'),
    pokedex = require('./pokedex.json'),
// using var so you can login with multiple users
    pgo = new PokemonGO.Pokeio(),
// load example config
    pgoConfig = require('./example-config.json');

let tools = {
    getPokemonByNumber: function (pokedexNumber) {
        return pokedex.pokemon[pokedexNumber - 1];
    }
};

pgo.init(pgoConfig.username, pgoConfig.password, pgoConfig.location, pgoConfig.provider, function (err) {
    if (err) throw err;

    console.log('[i] Current location: ' + pgo.playerInfo.locationName);
    console.log('[i] lat/long/alt: : ' + pgo.playerInfo.latitude + ' ' + pgo.playerInfo.longitude + ' ' + pgo.playerInfo.altitude);

    pgo.GetProfile(function (err, profile) {
        if (err) throw err;

        console.log('[i] Username: ' + profile.username);
        console.log('[i] Team: ' + profile.team);
        console.log('[i] Poke Storage: ' + profile.poke_storage);
        console.log('[i] Item Storage: ' + profile.item_storage);

        let pokecoin = 0,
            stardust = 0;

        for (let i = 0; i < profile.currency.length; i++) {
            switch (profile.currency[i].type) {
                case 'POKECOIN':
                    if (profile.currency[i].amount) {
                        pokecoin = profile.currency[i].amount;
                    }
                    break;
                case 'STARDUST':
                    if (profile.currency[i].amount) {
                        stardust = profile.currency[i].amount;
                    }
                    break;
                default:
                    console.warn('[w] Unknown currency:', profile.currency[i].type);
                    break;
            }
        }

        console.log('[i] Pokecoin: ' + pokecoin);
        console.log('[i] Stardust: ' + stardust);

        let nearbyPokemon = [],
            queueLocations = [],
            cbAllCollected = function (errors) {
                for (let i = 0; i < errors.length; i++) {
                    console.error('[e]', errors[i]);
                }

                // filter duplicated pokemon
                let realNearbyPokemon = [];
                for (let npIdx = 0; npIdx < nearbyPokemon.length; npIdx++) {
                    let shouldAdd = true;
                    for (let rnpIdx = 0; rnpIdx < realNearbyPokemon.length; rnpIdx++) {
                        if (realNearbyPokemon[rnpIdx].spawnPointId === nearbyPokemon[npIdx].spawnPointId) {
                            shouldAdd = false;
                            break;
                        }
                    }
                    if (shouldAdd) realNearbyPokemon.push(nearbyPokemon[npIdx]);
                }

                console.log('[i] Nearby Pokemon: ', realNearbyPokemon.length);

                let htmlOutput = swig.renderFile(__dirname + '/index.twig', {
                    apiKey: pgoConfig.maps.apikey,
                    jsConfig: JSON.stringify({
                        zoom: 18,
                        location: {
                            lat: pgo.playerInfo.latitude,
                            lng: pgo.playerInfo.longitude
                        },
                        pokemon: realNearbyPokemon
                    })
                });
                fs.writeFile(__dirname + '/public/index.html', htmlOutput, function (err) {
                    if (err) throw err;

                    console.log('[i] Map saved as html file.');
                });
            },
            delta = 0.0025,
            steps = pgoConfig.steps || 1,
            tmpLoc = pgo.GetLocationCoords(),
            tmpLat = tmpLoc.latitude - (steps / 2) * delta,
            tmpLng = tmpLoc.longitude - (steps / 2) * delta,
            tmpAlt = tmpLoc.altitude,
            totLocations = steps * steps,
            totLocationsStr = totLocations.toString();

        for (let x = 0; x < steps; x++) {
            for (let y = 0; y < steps; y++) {
                queueLocations.push({
                    latitude: tmpLat + x * delta,
                    longitude: tmpLng + y * delta,
                    altitude: tmpAlt
                })
            }
        }

        let crawl = function (errors) {
            if (queueLocations.length > 0) {
                let tmpLoc = queueLocations.shift(),
                    currPos = totLocations - queueLocations.length,
                    currPosStr = currPos.toString(),
                    currPercent = Math.round(((currPos - 1) / totLocations) * 100);

                while (currPosStr.length < totLocationsStr.length) {
                    currPosStr = ' ' + currPosStr;
                }

                console.log('[i] Loading in progress, ' + currPosStr + '/' + totLocationsStr + ', ' + currPercent + '%');

                pgo.SetLocation({
                    type: 'coords',
                    coords: tmpLoc
                }, function (errLocation) {
                    if (errLocation) {
                        errors.push(errLocation);

                        return crawl(errors);
                    } else {
                        return pgo.Heartbeat(function (errHeartbeat, hb) {
                            if (errHeartbeat) {
                                errors.push(errHeartbeat);
                            } else {
                                for (let i = 0; i < hb.cells.length; i++) {
                                    for (let j = 0; j < hb.cells[i].WildPokemon.length; j++) {
                                        let pokemon = tools.getPokemonByNumber(hb.cells[i].WildPokemon[j].pokemon.PokemonId);

                                        nearbyPokemon.push({
                                            location: {
                                                lat: hb.cells[i].WildPokemon[j].Latitude,
                                                lng: hb.cells[i].WildPokemon[j].Longitude
                                            },
                                            spawnPointId: hb.cells[i].WildPokemon[j].SpawnPointId,
                                            tsTillHidden: hb.cells[i].WildPokemon[j].TimeTillHiddenMs,
                                            tsNow: new Date().getTime(),
                                            pokedex: {
                                                num: pokemon.num,
                                                name: pokemon.name,
                                                type: pokemon.type,
                                                img: pokemon.img.replace('http://www.serebii.net/pokemongo', '/img')
                                            }
                                        });
                                    }
                                }
                            }

                            return crawl(errors);
                        });
                    }
                });
            } else {
                return cbAllCollected(errors);
            }
        };


        crawl([]);
    });
});
