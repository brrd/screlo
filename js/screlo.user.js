// ==UserScript==
// @name        screlo
// @namespace   http://revues.org/
// @include     /^http://lodel\.revues\.org/[0-9]{2}/*/
// @include     http://*.revues.org/*
// @version     14.07.22.1
// @downloadURL	https://raw.githubusercontent.com/thomas-fab/screlo/master/js/screlo.js
// @updateURL	https://raw.githubusercontent.com/thomas-fab/screlo/master/js/screlo.js
// @grant       none
// ==/UserScript==

var branch = 'master';

/* ----- Fin de l'entete ----- */

function Erreur(message, type) {
    this.type = typeof type !== 'undefined' ? type : 'danger';
    this.message = message;
}

// Contexte
function setContexte() { //TODO: revoir ce machin inutile
    var contexte = new Array();
    contexte.isTexte = $('body').hasClass('textes');
	contexte.isCompterendu = $("body").hasClass("compterendu");
	contexte.isNotedelecture = $("body").hasClass("notedelecture");
    contexte.isInformations = $("body").hasClass("informations");
    contexte.isActualite = $("body").hasClass("actualite");
    contexte.isPublications = $("body").hasClass("publications");
	contexte.admin = ($('#lodel-container').length !== 0);
    return contexte;
}

// Injection d'une feuille de style
function addCss() {
	$('head').append('<link rel="stylesheet" href="https://rawgit.com/thomas-fab/screlo/' + branch + '/css/screlo.css" type="text/css" />');
}

// Reference copier
function refCopier () {
	var copyInput = $(document.createElement('div')).html('<input id="reference-copier" type="text"></input>');
	copyInput.appendTo('body');
	
	$('span.paranumber').hover(function() {
		var n = $(this).text(),
			str = 'Dans l\'article ' + document.URL + ' au paragraphe ' + n + ', ';
		$('#reference-copier').val(str).select();
    }, function() {
		$('#reference-copier').blur();
    });
}

// Fixer le menu de navigation pour boucler sur tous les éléments
function fixNav() {
    function addNav(dirClass, url) {
        $('.navEntities').append($('<a></a>').addClass(dirClass).attr('href', url).css('border','2px green solid'));
    }
    
    if ($('.navEntities .goContents').length !== 0) {

        var currentId = location.pathname.match(/(\d+)$/g)[0], //TODO: passer en contexte
            tocUrl = $('.navEntities .goContents').attr('href'),
            result =  $("<div></div>").load( tocUrl + " #main", function() {
                var toc = $(this).find('ul.summary li a').map( function() {
                    return $(this).attr('href');
                }).get(),
                    i = $.inArray(currentId, toc);

                if (i !== -1) {
                    $('.navEntities a.goPrev, .navEntities a.goNext').remove();
                    if (i !== 0) {
                        addNav('goPrev', toc[i-1]);
                    } 
                    if (i+1 !== toc.length) {
                        addNav('goNext', toc[i+1]);
                    }
                    $('<span></span>').css({'float': 'left', 'margin': '2px 5px'}).text(Number(i+1) + '/' + Number(toc.length)).prependTo('.navEntities');
                }
            }); 
    }
}

// Liens vers la source sur TOC de la publication
function sourceDepuisToc() {
    $('ul.summary .title').each( function() {
        var id = $(this).children('a').eq(0).attr('href'),
            href ='lodel/edition/index.php?do=download&type=source&id=' + id;
        if (id !== undefined) {
            $(this).append('<a href="' + href + '"> Ⓦ</a>');
        }
    });   
}

// Bookmarklet debugger 
function debugStylage() {
    /*
     * debug_stylage.js
     * requiert jQuery - http://jquery.com
     */
    
	//$('<div>Les balises vides et les mises en forme locales ont \u00E9t\u00E9 mises en \u00E9vidence.</div>')
	//	.css({'color':'red','background':'#FF8','font':'12px sans-serif','padding':'6px','position':'absolute','z-index':'999999'})
	//	.prependTo('body');
		
	$('<style type="text/css">.TODO{background:#FF9DF9;cursor:help}.FIXME{color:red;background:#FF8}</style>')
		.appendTo('head');
	
	// On recherche les P et SPAN vides (sauf COinS !)
	$('p,span:not(.Z3988)').each(function() {
	
		// Elements vides
		var strEmpty = ($(this).get(0).tagName == 'P') ? 'paragraphe vide' : '\u00A0';
		if (($(this).text().match(/^(nbsp|\s)*$/g) !== null) && ($(this).has('img').length === 0)) // FIXME: fonctionne pas bien sur les <p> car span.paranumber fait que le text est jamais vide
			$(this).text(strEmpty).addClass('FIXME');
		
		// Mises en forme locales
		if ($(this).attr('style') !== undefined)
			$(this).attr('title', $(this).attr('style')).addClass('TODO');
			
	});
	
	$('img').each(function() {
		if ($(this).width() <= 1 || $(this).height() <= 1)
			$(this).css({'border':'6px solid red'}).addClass('FIXME').attr('title', 'Cette image est invisible');
	});
}

// Barre d'outils/erreurs
function retournerUrl(quoi) {
    var h = location.href,
        p = location.pathname,
        a = p.replace(/[^/]+$/g, ''),
        b = p.match(/(\d+)$/g);
    if (quoi === "doc") {
       h = 'http://' + window.location.host + a + 'lodel/edition/index.php?do=download&type=source&id=' + b;
    } else if (quoi === "otx") {
        // FIXME: Ne pas encore uitiliser il faut choper id parent
        // http://lodel.revues.org/10/corela/lodel/edition/oochargement.php?identity=1504&idparent=833&reload=1
    } else if (quoi === "editer") {
       // http://lodel.revues.org/10/corela/lodel/edition/index.php?do=view&id=1504
       h = 'http://' + window.location.host + a + 'lodel/edition/index.php?do=view&id=' + b;   
    } else if (typeof quoi === 'string') {
		h = 'http://' + window.location.host + a + quoi;   
	}

    return h;   
}
function setRelectureBox() {
	// Creation
	$('<div id="relecture_box"><ul id="liste_erreurs"></ul></div>').appendTo('body');

	// Inspecteur de classes 
	$('<div id="class_inspector"></div>').appendTo('#relecture_box');
	$('#text p').hover( function() {
		var cl = $( this ).attr("class"); // FIXME: virer les classes injectees par le script
		$('#class_inspector').text(cl);
	}, function() {
		$('#class_inspector').text('');
	});
	
	// Boutons
	$('<div id="relecture_buttons"><form id="acces_rapide"><input type="text" id="id_acces"></input><input type="submit" value="go"/></form><a title="Version" href="#" id="version_popup"><img src="https://raw.githubusercontent.com/thomas-fab/screlo/' + branch + '/css/about.png" alt ="Version"/></a><a title="Document source" href="' + retournerUrl('doc') + '"><img src="https://raw.githubusercontent.com/thomas-fab/screlo/' + branch + '/css/docsource.png" alt ="Document source"/></a><a title="Editer" href="' + retournerUrl('editer') + '"><img src="https://raw.githubusercontent.com/thomas-fab/screlo/' + branch + '/css/edit.png" alt="Editer" /></a></div>').appendTo('#relecture_box');
	
	// Fonctions
	$( "#version_popup" ).click(function( event ) {
		event.preventDefault();
		var msg = 'ScReLo (' + branch + ') version ' + GM_info.script.version + '\nUne mise à jour est peut-être disponible. Forcer la mise à jour ?',
			mettreAJour = false;
		mettreAJour = confirm(msg);
		if (mettreAJour) {
			window.location.href = 'https://rawgit.com/thomas-fab/screlo/' + branch  + '/js/screlo.user.js';
		}
	});
	
	$( "#acces_rapide" ).submit(function( event ) {
		event.preventDefault();
		var idAcces = $('input#id_acces').val();
		if (typeof idAcces === 'string') {
			window.location.href = retournerUrl(idAcces);
		}
	});
	
}

// Colorer les liens dans le texte pour mieux les voir
function colorerLiens() {
    $('#main p a[href]:not(.footnotecall):not(.FootnoteSymbol)').css('background-color','lightblue');
}

// Ajouter marqueur (signaler les erreurs dans le texte)
function ajouterMarqueur(element, message, type, after) {
    var type = typeof type !== 'undefined' ? type : 'danger';

    if (element.nodeType === 1 && message){
        var span = $('<span class="screlo-marqueur"></span>').addClass(type).text(message);
        if (!after) {
            span.prependTo(element);
        } else {
            span.appendTo(element);    
        }
    } else {
        console.log('Erreur de parametre de ajouterMarqueur()'); // TODO: throw new Error
    }
}

// Afficher
function afficherRelecture(tests) {
	var condition,
		action,
		danger = 0,
		warning = 0,
		msg = '';
	for (var i = 0; i < tests.length; i++) {
		condition = tests[i].condition(); // TODO: condition = variable plutot qu'une fonction ?
		if (condition) {
			res = tests[i].action();
			if (res instanceof Erreur) {
				var li = $('<li class="erreur ' + res.type + '">' + res.message + '</li>')
				if (res.type === "danger") {
					li.prependTo('#relecture_box ul#liste_erreurs');
					danger++;
				} else {
					li.appendTo('#relecture_box ul#liste_erreurs');
					warning++;
				}
			}
		}
	}
	if (danger) {
		msg += '<span style="color: #D2322D;">' + danger + ' erreur(s)</span>';
	}
	if (danger && warning) {
		msg += ', ';
	}
	if (warning) {
		msg += '<span style="color: #ED9C28;">' + warning + ' avertissement(s) </span>';
	}
	$('<p>' + msg + '</p>').prependTo('#relecture_box');
}

// GO !
if (window.jQuery) {  
	$( document ).ready( function(){
	
		// Initialisation des tableaux
		// 1. LE CONTEXTE
		var contexte = setContexte();

		// 2. LES TESTS
		var tests = [
				
			// Pas d'auteur ou auteur pas valide
			{
				condition : function () {
                    return contexte.isTexte && !contexte.isActualite && !contexte.isInformations;
				},
				action : function () {
					var champAuteur = $('#docAuthor');
					if(champAuteur.length === 0){
						return new Erreur('Pas d\'auteur',  'danger');
					} else if (champAuteur.text().trim().match(/ /) === null) { //FIXME: || champAuteur.text().trim().match(/^([A-zéàèç -,])+$/) === null la regex sur le latin ca craint + le nbsp passe pas
						return new Erreur('Vérifier le nom de l\'auteur',  'warning');
					}
				}
			},
				
			// Pas de facsimile
			{
				condition : function () {
                    return contexte.isTexte;
				},
				action : function () {
					if($('#wDownload.facsimile').length === 0){
						return new Erreur('Pas de facsimile',  'warning');
					}
				}
			},
			
			// Pagination
			{
				condition : function () {
					return contexte.isTexte;
				},
				action : function () {
					if($('#docPagination').length === 0){
						return new Erreur('Pas de pagination',  'warning');
					} else if(!/^p\. [0-9-]*$/i.test($('#docPagination').text())) {
						return new Erreur('Mauvais format de pagination',  'danger');
					}
				}
			},
				
			// Date de publication electronique
            // NOTE: provient du numéro !
			{
				condition : function () {
					return contexte.isTexte;
				},
				action : function () {
					// FIXME: ce test ne fonctionne que si la page est affichée en français
					var refElectro = $('#quotation > h3:last').next('p').text();
					if (refElectro.match(/mis en ligne le ,/)) {
						return new Erreur('Pas de date de publication électronique',  'danger');
					}
				}
			},			

			// Compterendu/notedelecture sans reference
			{	
				condition : function () {
					return contexte.isTexte && (contexte.isCompterendu || contexte.isNotedelecture);
				},
				action : function () {
					if ($("#docReference").length === 0) {
						return new Erreur('Pas de référence de l\'oeuvre',  'danger');
					}
				}
			},
						   
			// Police Symbol
			{
				condition : function () {
					return contexte.isTexte;
				},
				action : function () {
					var el = $('#content [style*="Symbol"], #content [style*="symbol"]');
					if (el.length !== 0) {						
						el.each(function() {
                            ajouterMarqueur(this, "Symbol");
						});
						return new Erreur('Police "Symbol" utilisée (' + el.length + ')');
					}
				}
			},

			// Police Wingdings
			{
				condition : function () {
					return contexte.isTexte;
				},
				action : function () {
					var el = $('#content [style*="Wingdings"], #content [style*="wingdings"]');
					if (el.length !== 0) {
						el.each(function() {
                            ajouterMarqueur(this, "Wingdings");
						});
						return new Erreur('Police "Wingdings" utilisée (' + el.length + ')');
					}
				}
			},
				
			// Police Webdings
			{
				condition : function () {
					return contexte.isTexte;
				},
				action : function () {
					var el = $('#content [style*="Webdings"], #content [style*="webdings"]');
					if (el.length !== 0) {
						el.each(function() {
                            ajouterMarqueur(this, "Webdings");
						});
						return new Erreur('Police "Webdings" utilisée (' + el.length + ')');
					}
				}
			},
				
			// Br dans le titre de l'article
			{
				condition : function () {
					return contexte.isTexte;
				},
				action : function () {
					var titre = $('h1#docTitle');
					if (titre.find('br').length > 0) {
						return new Erreur('Retour à la ligne dans le titre');
					}
				}
			},
			
			// Br dans les intertitres
			{
				condition : function () {
					return contexte.isTexte;
				},
				action : function () {
					var l = $('.texte:header br').length;
					
					if (l > 0) {
						return new Erreur('Intertitre contenant un retour à la ligne (' + l + ')'); // TODO: ajouter un marqueur
					}
				}
			},
				
			// Ordre des meta illustration : titreillus
			// FIXME: quand on a titreillus, illus, titreillus, illus, titreillus, illus ça matche quand même
			{
				condition : function () {
					return contexte.isTexte;
				},
				action : function () {
					// titreillus apres illus = erreur, sauf si suivi d'illus
					var compteur = 0;
					
					$('table + .titreillustration, img + .titreillustration, div.textIcon + .titreillustration').each( function() {
						if($(this).next('.titreillustration').length === 0) {
							compteur++;
                            ajouterMarqueur(this, "Repositionner ce titre");
						}
					});
					
					if(compteur > 0) {
						return new Erreur('Titre après illustration (' + compteur + ')');
					}
				}
			},
				
			// Paragraphes qui commencent par une minuscule (sauf paragraphes sans retrait et citations)
			{
				condition : function () {
					return contexte.isTexte;
				},
				action : function () {
					var compteur = 0;
					
					// NOTE: les span paranumber fichent le bazar, il faut les virer (dans un clone) 
					// FIXME: certains elements (ex : citations) nont pas de paranumber, inutile de checher a le sortir
					// TODO: en faire une fonction pour réutiliser
					$('#text > .text > *:not(.citation,.paragraphesansretrait)').each( function() {
						var clone = $(this).clone(); // TODO: c'est peut-etre pas ideal niveau perf, a verifier. Peut-etre mieux de recuperer les textNodes après chaque span.paranumber ?
						clone.find('span.paranumber').remove();
						var string = String(clone.text()).trim();
						if (string.match(/^[a-z]/)) {
                            ajouterMarqueur(this, "Minuscule", "warning");
							compteur++;
						}
					});
					
					if(compteur > 0) {
						return new Erreur('Caractère minuscule en début de paragraphe (' + compteur + ')', 'warning');
					}
				}
			},
            
            // Paragraphes "Normal" qui commencent par une puce de liste
            {
                condition : function () {
                    return contexte.isTexte;
                },
                action : function () {
                    var compteur = 0;

                    // NOTE: les span paranumber fichent le bazar, il faut les virer (dans un clone) 
                    // FIXME: certains elements (ex : citations) nont pas de paranumber, inutile de checher a le sortir
                    // TODO: en faire une fonction pour réutiliser
                    $('#text > .text > p.texte').each( function() {
                        var clone = $(this).clone(); // TODO: c'est peut-etre pas ideal niveau perf, a verifier. Peut-etre mieux de recuperer les textNodes après chaque span.paranumber ?
                        clone.find('span.paranumber').remove();
                        var string = String(clone.text()).trim();
                        if (string.match(/^[•∙◊–—>-]/)) { // TODO: ajouter *) *. *- */ pour les ol
                            ajouterMarqueur(this, "Liste", "warning");
                            compteur++;
                        }
                    });

                    if(compteur > 0) {
                        return new Erreur('Listes manquantes (' + compteur + ')', 'warning');
                    }
                }
            },
				
			// Styles inconnus : checker tous les paragraphes du texte. Si c'est pas dans la whitelist on signale (genre le fameux "grillecouleur-accent1")
			{
				condition : function () {
					return contexte.isTexte;
				},
				action : function () {
                    var textWhitelist = "p.remerciements, p.texte, p.paragraphesansretrait, p.creditillustration, p.epigraphe, p.citation, p.citationbis, p.citationter, p.titreillustration, p.legendeillustration, p.question, p.reponse, p.separateur, p.encadre";
					var compteur = 0; //TODO: l'ideal serait de compter par style et de faire une enumération des styles en alerte avec le nb à chaque fois 
					$('#text > .text p').each( function() { //TODO : pour l'instant p uniqument, mais pourquoi pas plus ? >> sinon utiliser attr() plutôt que is().
						if (!$(this).is(textWhitelist)) {
                            ajouterMarqueur(this, 'Style inconnu : ' + $(this).attr('class'));
							compteur++;
						}
					});
					
					if(compteur > 0) {
						return new Erreur('Styles inconnus utilisés (' + compteur + ')');
					}
				}
			},
				
			// Numérotation des notes de bas de page
			{
				condition : function () {
					return contexte.isTexte;
				},
				action : function () {
					var e = false;
					$('#notes > p > a[id^=ftn]').each( function(index) {
						if($(this).text() != index + 1) {
							e = true;
							return false;
						}
					});
					if (e) {
						return new Erreur('Incohérence dans la numérotation des notes', 'warning');
					}
				}
			},

			// Arborescences interdites
			{
				condition : function () {
					return contexte.isTexte;
				},
				action : function () {
					var compteur = 0,
						blackList = 'ol :header, ul :header, li:header'; 
					
					$(blackList).each( function() {
						compteur++;
                        ajouterMarqueur(this, "Arborescence interdite");
					});
					
					if(compteur > 0) {
						return new Erreur('Arborescence interdite (' + compteur + ')');
					}
				}			
			},
			
			// Ponctuation à la fin des intertitres
			{
				condition : function () {
					return contexte.isTexte;
				},
				action : function () {
					var compteur = 0;
					
					$('.texte:header').each( function() {
						if( $(this).text().trim().match(/[\.:;=]$/) ) {
							compteur++;
                            ajouterMarqueur(this, "Ponctuation", "danger", true);
						}
					});
					
					if(compteur > 0) {
						return new Erreur('Ponctuation à la fin des intertitres (' + compteur + ')');
					}
				}			
			},
			
			// Mises en formes locales sur le titre
			{
				condition : function () {
					return contexte.isTexte;
				},
				action : function () {
					if ($('#docTitle[style], #docTitle [style]').length !== 0) {
						return new Erreur('Mises en formes locales sur le titre', 'danger');
					}
				}			
			},
			
			// Appel de note dans le titre
			{
				condition : function () {
					return contexte.isTexte;
				},
				action : function () {
					if ($('#docTitle .footnotecall').length !== 0) {
						return new Erreur('Appel de note dans le titre', 'warning');
					}
				}			
			},
			
			// Titre d'illustration en légende
			{
				condition : function () {
					return contexte.isTexte;
				},
				action : function () {
					var compteur = 0;
					
					$('.legendeillustration').each( function() {
						if( $(this).text().match(/^(fig|tabl)/i) ) {
							compteur++;
                            ajouterMarqueur(this, "Titre plutôt que légende", "warning");
						}
					});
					
					if(compteur > 0) {
						return new Erreur('Titre d\'illustration stylé en légende (' + compteur + ')', 'warning');
					}
				}			
			},
            
            // Champs d'index Word
            {
                condition : function () {
                    return contexte.isTexte;
                },
                action : function () {
                    var compteur = 0;

                    $("a:contains('Error: Reference source not found'), a[href^='#id']").each( function() {
                            compteur++;
                            ajouterMarqueur(this, "Champ d'index", "danger");
                    });

                    if(compteur > 0) {
                        return new Erreur('Champ d\'index Word (' + compteur + ')', 'danger');
                    }
                }			
            } //,
					
		];
        
        // 3. LES OUTILS
        
        // Liens vers la source depuis la TOC
        sourceDepuisToc();
        		
		// Debug stylage auto
		debugStylage();
		
		// CSS
		addCss();
            
        // Fixer la nav
        fixNav();
			   
		// References para
		refCopier();
		
		// Colorer les liens
		colorerLiens();
		
		// Div relecture_box
		setRelectureBox();
		
		// Tests + affichage
		afficherRelecture(tests);
		
		console.log('Script ' + GM_info.script.name + '.js version ' + GM_info.script.version + ' chargé.');
	
	});
}